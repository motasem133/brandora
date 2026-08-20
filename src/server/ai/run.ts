import 'server-only'

import { createOpenRouter, type OpenRouterProviderOptions } from '@openrouter/ai-sdk-provider'
import { generateObject } from 'ai'
import type { z } from 'zod'

import { AppError } from '@/lib/errors'
import { env } from '@/lib/env'
import { db } from '@/server/db'
import { aiUsage } from '@/server/db/schema'
import { isNetworkError, isTimeoutError } from './failures'
import { estimateCost, modelChain, type ModelTask } from './models'

const openrouter = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY ?? '',
  headers: {
    // Attribution on OpenRouter's public leaderboards.
    'HTTP-Referer': env.NEXT_PUBLIC_APP_URL,
    'X-Title': 'Brandora',
  },
})

/**
 * Reasoning off, for every call that goes through here.
 *
 * Everything in this file is `generateObject` against a strict schema. A
 * reasoning model emits its chain of thought *before* the answer and out of the
 * same budget, and none of it is kept — `result.object` is the schema, the
 * reasoning is discarded. So it was being paid for in latency and tokens and
 * then thrown away, and on the Arabic chain it was not merely wasted: the
 * reasoning consumed the whole completion and the answer never arrived.
 *
 * Measured against the real `brandingSchema` and a real Arabic brief, 90-second
 * ceiling, before and after:
 *
 *   qwen/qwen3.7-max     timeout at 90s  ->  ok in 20.9s
 *   z-ai/glm-5.2         timeout at 90s  ->  ok in 13.7s
 *   deepseek/deepseek-v4-pro   ok 32.5s  ->  ok in 16.1s
 *
 * The English primary was not failing, and halving it still matters: its
 * successes averaged 43 seconds against the 60-second deadline below, which is
 * a task that succeeds until the day the provider is slightly slow.
 *
 * `none` rather than a `max_tokens` budget because there is no amount of
 * discarded reasoning worth waiting for on a call whose entire output is a
 * filled-in schema. Note this does not touch the assistant: that streams
 * through `streamText` in `app/api/assistant/route.ts` and never comes here,
 * which is right — it is a conversation, and reasoning is worth having in one.
 *
 * Typed rather than inlined so the provider's own types check the shape. The
 * realistic regression is a typo in a key that would otherwise be accepted and
 * silently ignored, putting the timeouts back with nothing to show why.
 */
const NO_REASONING: OpenRouterProviderOptions = { reasoning: { effort: 'none' } }

type UsageContext = {
  organizationId: string
  projectId?: string
  generationJobId?: string
  /* Every value here must also exist in the `ai_feature` enum. `recordUsage`
     swallows its own insert failures, so one that is missing there loses the
     telemetry silently instead of failing anything. */
  feature:
    | 'branding'
    | 'website'
    | 'social'
    | 'kit'
    | 'logo'
    | 'assistant'
    | 'vectorize'
    | 'content'
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

  /*
   * How long one model gets before the chain moves on.
   *
   * A minute is right for a caption set and wrong for a whole website: the site
   * is four or five pages of real copy in one response, and a model that is
   * writing steadily at fifty seconds is not stuck.
   *
   * Branding joins it, and the reason is a customer's brand that came out
   * empty. Branding is the heaviest thinking task here — five names with
   * rationales, a story, a palette that has to pass a contrast rule, fonts,
   * values and a voice, in one structured answer from a reasoning model — and
   * it had the same minute as a caption set. All three models in its chain hit
   * that minute in turn, so the run produced nothing at all.
   *
   * The numbers below used to argue that a minute was clear of honest work.
   * Read again they argue the opposite: branding's median is thirty-one
   * seconds, and social — median *two* seconds — reaches eighty-eight at the
   * 90th percentile. A task fifteen times slower at the median does not have
   * its long tail safely under sixty seconds. The cap was sitting inside
   * branding's normal spread, not out past it.
   *
   * Ninety is a starting value, not a measured one. The figure that should set
   * it is branding's own p95 in `ai_usage` — which, now that timeouts are
   * recorded as timeouts rather than as errors, is finally a question that
   * table can answer.
   */
  const ATTEMPT_TIMEOUT_MS =
    options.task === 'website' || options.task === 'brandingEn' || options.task === 'brandingAr'
      ? 90_000
      : 60_000

  /*
   * What the whole call gets, across every model and every retry.
   *
   * Per-attempt limits alone cannot keep this inside the Inngest route's
   * 300-second ceiling: raising branding to ninety seconds makes three attempts
   * two hundred and seventy, and the backoff waits below sit on top of that.
   * Overrunning the ceiling is the worst outcome available — the function is
   * killed mid-step, so nothing records the failure and the customer's credits
   * stay held until the nightly sweep finds them.
   *
   * A budget decouples "how long may one model take" from "how many models are
   * in the chain", which is the coupling that forced the per-attempt value to
   * be too tight in the first place. The last attempt may get less than the
   * full ninety seconds as a result. That is the right way to be wrong: a
   * shortened final attempt still might succeed, where a killed function
   * cannot.
   */
  const CHAIN_BUDGET_MS = 255_000

  /** Below this an attempt is not worth starting — it would only burn budget. */
  const MIN_ATTEMPT_MS = 20_000

  const deadline = Date.now() + CHAIN_BUDGET_MS

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

      // Waiting only to be cut off on arrival helps nobody; stop while the
      // failure can still be recorded and the hold released cleanly.
      if (Date.now() + wait + MIN_ATTEMPT_MS > deadline) {
        console.warn(`[ai] ${options.task}: out of budget, not retrying`)
        break
      }

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

    /*
     * What is left of the budget, and whether it is enough to be worth using.
     *
     * Stopping early is deliberate: an attempt given eight seconds will fail on
     * eight seconds and the only thing it changes is that the customer waits
     * longer to be told so.
     */
    const remaining = deadline - startedAt
    if (remaining < MIN_ATTEMPT_MS) {
      console.warn(
        `[ai] ${options.task}: budget spent, skipping ${chain.length - attempt} remaining model(s)`,
      )
      break
    }

    const attemptTimeoutMs = Math.min(ATTEMPT_TIMEOUT_MS, remaining)

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
        providerOptions: { openrouter: NO_REASONING },
        /*
         * A hung provider used to own the whole run.
         *
         * There was no deadline here at all, so an attempt ran until something
         * further out gave up — and the chain cannot try the next model while
         * it is still waiting for this one.
         *
         * Whichever is smaller: this task's own limit, or whatever is left of
         * the call's total budget. See both notes at the top.
         */
        abortSignal: AbortSignal.timeout(attemptTimeoutMs),
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

      /*
       * A model that ran out of time and a model that answered badly are not
       * the same failure, and until now `ai_usage` called both of them `error`.
       * The `timeout` value has existed in the `ai_status` enum from the start
       * and nothing ever wrote it — so the one question worth asking of this
       * table, "are we cutting calls off too early?", was the one question it
       * could not answer. Diagnosing the brand that came out empty meant
       * reading this file instead of reading a column.
       *
       * The zeros below are not a claim that a timed-out attempt was free. No
       * response arrived, so there are no token counts to record and no cost to
       * read from it — but the provider may well have billed for the work it
       * did before we hung up. Labelled as a timeout, a row of zeros is at
       * least legible as "spend we cannot see" rather than "spend that did not
       * happen".
       */
      const timedOut = isTimeoutError(error)

      await recordUsage({
        ...options.context,
        model,
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        costUsd: 0,
        latencyMs: Date.now() - startedAt,
        status: timedOut ? 'timeout' : 'error',
      })

      /*
       * "response did not match schema" on its own cannot be acted on.
       *
       * It is the most common way a model fails here and the message says
       * nothing about which field, so diagnosing one meant re-running the call
       * by hand with a debugger attached. The AI SDK carries the validation
       * error underneath, and it names the field.
       *
       * Printing the tail of the cause's *message* was the previous attempt at
       * that, and it does not work: the message is the rejected value followed
       * by the reason, both truncated to whatever 500 characters happened to
       * land there. Chasing a website failure through it yielded half a
       * paragraph of Arabic copy and no field name, which is how a run that was
       * simply timing out got mistaken for a schema bug.
       *
       * The issues are structured, and they are nested — a `NoObjectGenerated`
       * wraps a `TypeValidation` wraps the `ZodError` — so this walks the cause
       * chain for the first thing carrying `issues` and prints the paths.
       */
      console.warn(
        `[ai] ${options.task} failed on ${model} (attempt ${attempt + 1}/${chain.length})`,
        error instanceof Error ? error.message : error,
        formatIssues(error),
      )
    }
  }

    return { ok: false, error: lastError }
  }
}

/** OpenRouter reports real cost in provider metadata; shape is loosely typed. */
export function extractCost(metadata: unknown): number | null {
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

/**
 * Writes one `ai_usage` row. Exported because the assistant streams its own
 * calls rather than going through `runModel`, and was keeping a second copy of
 * this insert that wrote its cost as a literal zero.
 */
export async function recordUsage(row: {
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


/**
 * The field names out of a schema failure, or the message tail when there are
 * none.
 *
 * Six levels because the nesting is not contractual — the SDK is free to add a
 * wrapper — and a diagnostic that stops working after a minor upgrade is worse
 * than no diagnostic, because nothing announces that it stopped.
 *
 * Five issues, because a model that got twenty fields wrong got the shape wrong,
 * and the first few say so just as well as all twenty.
 */
function formatIssues(error: unknown): string {
  let current: unknown = error

  for (let depth = 0; depth < 6 && current; depth += 1) {
    const node = current as {
      issues?: { path?: unknown[]; message?: string }[]
      cause?: unknown
    }

    if (Array.isArray(node.issues) && node.issues.length > 0) {
      const named = node.issues
        .slice(0, 5)
        .map((issue) => `${(issue.path ?? []).join('.') || '(root)'}: ${issue.message ?? '?'}`)
        .join('; ')

      return `— ${named}${node.issues.length > 5 ? ` (+${node.issues.length - 5} more)` : ''}`
    }

    current = node.cause
  }

  const cause = error instanceof Error ? (error.cause as Error | undefined) : undefined
  return cause?.message ? `— ${cause.message.slice(-300)}` : ''
}
