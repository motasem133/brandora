import 'server-only'

import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateObject } from 'ai'
import type { z } from 'zod'

import { AppError } from '@/lib/errors'
import { env } from '@/lib/env'
import { db } from '@/server/db'
import { aiUsage } from '@/server/db/schema'
import { estimateCost, modelChain, type ModelTask } from './models'

const openrouter = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY ?? '',
  headers: {
    // Attribution on OpenRouter's public leaderboards.
    'HTTP-Referer': env.NEXT_PUBLIC_APP_URL,
    'X-Title': 'Brandora',
  },
})

type UsageContext = {
  organizationId: string
  projectId?: string
  generationJobId?: string
  /* Every value here must also exist in the `ai_feature` enum. `recordUsage`
     swallows its own insert failures, so one that is missing there loses the
     telemetry silently instead of failing anything. */
  feature: 'branding' | 'website' | 'social' | 'logo' | 'assistant' | 'vectorize' | 'content'
}

type RunOptions<T extends z.ZodType> = {
  task: ModelTask
  schema: T
  system: string
  prompt: string
  temperature?: number
  context: UsageContext
}

/**
 * Every text generation goes through here.
 *
 * Walks the task's model chain until one returns schema-valid output, records
 * a row in `ai_usage` for each attempt (success or failure), and throws only
 * when the whole chain is exhausted.
 */
export async function runModel<T extends z.ZodType>(options: RunOptions<T>): Promise<z.infer<T>> {
  if (!env.OPENROUTER_API_KEY) {
    throw new AppError('AI_PROVIDER_ERROR', 'OPENROUTER_API_KEY is not configured.')
  }

  const chain = modelChain(options.task)
  let lastError: unknown

  /** How long one model gets before the chain moves on. See the call below. */
  const ATTEMPT_TIMEOUT_MS = 60_000

  /*
   * The chain answers "this model is having a bad day" by trying another one.
   * It has no answer for "there is no network", because in that case every
   * model in it fails for the same reason, in about a second, and the section
   * is marked failed over an outage that lasted less than a minute.
   *
   * That is not hypothetical: a brand run lost its website section to a DNS
   * blip while the social section, retried moments later, went through.
   *
   * So a connection-level failure re-runs the whole chain after a wait rather
   * than falling to the next model. Waits are short and few — this covers the
   * blip, and a real outage is still Inngest's problem to retry the step.
   */
  const BACKOFF_MS = [4_000, 15_000, 45_000]

  for (let pass = 0; pass <= BACKOFF_MS.length; pass += 1) {
    if (pass > 0) {
      const wait = BACKOFF_MS[pass - 1]
      console.warn(`[ai] ${options.task}: the network is unreachable, retrying in ${wait / 1000}s`)
      await new Promise((resolve) => setTimeout(resolve, wait))
    }

    const outcome = await runChain()
    if (outcome.ok) return outcome.value

    // Anything the models themselves rejected — a schema they could not
    // satisfy, a refusal, a bad key — is not going to be fixed by waiting.
    if (!isNetworkError(outcome.error)) break
  }

  throw new AppError(
    'AI_PROVIDER_ERROR',
    `All models failed for ${options.task}: ${lastError instanceof Error ? lastError.message : 'unknown error'}`,
  )

  async function runChain(): Promise<{ ok: true; value: z.infer<T> } | { ok: false; error: unknown }> {
  for (const [attempt, model] of chain.entries()) {
    const startedAt = Date.now()

    try {
      const result = await generateObject({
        model: openrouter(model),
        schema: options.schema,
        system: options.system,
        prompt: options.prompt,
        temperature: options.temperature ?? 0.8,
        // One retry inside the SDK for transient network errors; anything
        // structural falls through to the next model instead.
        maxRetries: 1,
        /*
         * A hung provider used to own the whole run.
         *
         * There was no deadline here at all, so an attempt ran until something
         * further out gave up. `ai_usage` shows what that costs: social has a
         * median of two seconds and a 90th percentile of eighty-eight, website
         * twelve and seventy-seven. Those are not slow answers, they are calls
         * that stopped answering — and the chain below cannot try the next
         * model while it is still waiting for this one.
         *
         * Set well clear of honest work rather than tight: the slowest real
         * median in the table is branding at thirty-one seconds, and cutting a
         * call that was going to succeed trades a slow section for a failed
         * one. This only ends the calls that were never coming back.
         */
        abortSignal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
      })

      const inputTokens = result.usage?.inputTokens ?? 0
      const outputTokens = result.usage?.outputTokens ?? 0

      await recordUsage({
        ...options.context,
        model,
        inputTokens,
        outputTokens,
        cachedTokens: result.usage?.inputTokenDetails?.cacheReadTokens ?? 0,
        // OpenRouter returns true upstream cost; estimation is the fallback.
        costUsd: extractCost(result.providerMetadata) ?? estimateCost(model, inputTokens, outputTokens),
        latencyMs: Date.now() - startedAt,
        status: 'success',
      })

      // generateObject's return type widens through the generic; the schema
      // already guarantees the shape.
      return { ok: true, value: result.object as z.infer<T> }
    } catch (error) {
      lastError = error

      await recordUsage({
        ...options.context,
        model,
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        costUsd: 0,
        latencyMs: Date.now() - startedAt,
        status: 'error',
      })

      console.warn(
        `[ai] ${options.task} failed on ${model} (attempt ${attempt + 1}/${chain.length})`,
        error instanceof Error ? error.message : error,
      )
    }
  }

    return { ok: false, error: lastError }
  }
}

/**
 * Could not reach the provider at all, as opposed to being answered badly.
 *
 * Matched on the codes the runtime actually raises — DNS, refused, reset,
 * timed out — rather than on message text, which changes between Node
 * versions and SDK releases. `AI_APICallError` wraps the cause, so the chain
 * is walked.
 */
export function isNetworkError(error: unknown): boolean {
  const CODES = new Set([
    'ENOTFOUND',
    'ECONNREFUSED',
    'ECONNRESET',
    'EAI_AGAIN',
    'ETIMEDOUT',
    'EHOSTUNREACH',
    'ENETUNREACH',
    'UND_ERR_CONNECT_TIMEOUT',
    'UND_ERR_SOCKET',
  ])

  for (let current = error, depth = 0; current && depth < 5; depth += 1) {
    const node = current as { code?: unknown; errors?: unknown[]; cause?: unknown }

    if (typeof node.code === 'string' && CODES.has(node.code)) return true
    // fetch wraps its attempts in an AggregateError.
    if (Array.isArray(node.errors) && node.errors.some((inner) => isNetworkError(inner))) return true

    current = node.cause
  }

  return false
}

/** OpenRouter reports real cost in provider metadata; shape is loosely typed. */
function extractCost(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== 'object') return null
  const openrouterMeta = (metadata as Record<string, unknown>).openrouter
  if (!openrouterMeta || typeof openrouterMeta !== 'object') return null

  const usage = (openrouterMeta as Record<string, unknown>).usage
  if (usage && typeof usage === 'object') {
    const cost = (usage as Record<string, unknown>).cost
    if (typeof cost === 'number') return cost
  }

  const direct = (openrouterMeta as Record<string, unknown>).cost
  return typeof direct === 'number' ? direct : null
}

async function recordUsage(row: {
  organizationId: string
  projectId?: string
  generationJobId?: string
  feature: UsageContext['feature']
  model: string
  inputTokens: number
  outputTokens: number
  cachedTokens: number
  costUsd: number
  latencyMs: number
  status: 'success' | 'error' | 'timeout'
}) {
  try {
    await db.insert(aiUsage).values({
      organizationId: row.organizationId,
      projectId: row.projectId ?? null,
      generationJobId: row.generationJobId ?? null,
      feature: row.feature,
      provider: 'openrouter',
      model: row.model,
      inputTokens: row.inputTokens,
      outputTokens: row.outputTokens,
      cachedTokens: row.cachedTokens,
      costUsd: row.costUsd.toFixed(6),
      latencyMs: row.latencyMs,
      status: row.status,
    })
  } catch (error) {
    // Telemetry must never take down a generation that otherwise succeeded.
    console.error('[ai] failed to record usage', error)
  }
}
