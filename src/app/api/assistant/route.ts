import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from 'ai'
import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { env } from '@/lib/env'
import { assistantSystemPrompt, buildAssistantTools } from '@/server/ai/assistant'
import { MODELS } from '@/server/ai/models'
import { db } from '@/server/db'
import { getOrgPlan } from '@/server/db/queries/plans'
import { getProject } from '@/server/db/queries/projects'
import {
  aiUsage,
  assistantMessages,
  assistantThreads,
  brandingAssets,
  socialMediaAssets,
} from '@/server/db/schema'
import { toErrorResponse } from '@/server/api-error'
import { requireOrg } from '@/server/session'

export const maxDuration = 120

const bodySchema = z.object({
  projectId: z.uuid(),
  messages: z.array(z.any()),
})

const openrouter = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY ?? '',
  headers: { 'HTTP-Referer': env.NEXT_PUBLIC_APP_URL, 'X-Title': 'Brandora' },
})

/**
 * Brand Assistant chat.
 *
 * A Route Handler rather than a Server Action because Server Actions cannot
 * stream tokens, and a chat that arrives all at once after ten seconds reads as
 * broken even when it is not.
 */
export async function POST(request: Request) {
  try {
    return await handle(request)
  } catch (error) {
    return toErrorResponse(error)
  }
}

async function handle(request: Request) {
  const parsed = bodySchema.safeParse(await request.json())
  if (!parsed.success) {
    return Response.json({ error: { code: 'VALIDATION' } }, { status: 422 })
  }

  const { projectId, messages } = parsed.data

  // Route handlers are outside the action middleware, so the tenant check is
  // explicit here.
  const { org } = await requireOrg()
  const project = await getProject(org.id, projectId)
  if (!project) return Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })

  const plan = await getOrgPlan(org.id)
  if (!plan?.brandAssistant) {
    return Response.json(
      { error: { code: 'FEATURE_LOCKED', message: 'The Brand Assistant is available on Pro and above.' } },
      { status: 403 },
    )
  }

  if (!env.OPENROUTER_API_KEY) {
    return Response.json({ error: { code: 'AI_PROVIDER_ERROR' } }, { status: 503 })
  }

  const [branding, social] = await Promise.all([
    db.select().from(brandingAssets).where(eq(brandingAssets.projectId, projectId)).limit(1),
    db.select().from(socialMediaAssets).where(eq(socialMediaAssets.projectId, projectId)).limit(1),
  ])

  const thread = await ensureThread(projectId)
  const uiMessages = messages as UIMessage[]

  // Persist the user's turn before the model runs, so a failed generation still
  // leaves the conversation intact rather than losing what they typed.
  const latest = uiMessages.at(-1)
  if (latest?.role === 'user') {
    await db.insert(assistantMessages).values({
      threadId: thread.id,
      role: 'user',
      content: textOf(latest),
    })
  }

  const startedAt = Date.now()
  const model = MODELS.assistant.primary

  const result = streamText({
    model: openrouter(model),
    system: assistantSystemPrompt({
      projectName: project.businessName || project.title,
      language: project.language,
      branding: branding[0] ?? null,
      social: social[0] ?? null,
      hasSocial: Boolean(social[0]),
    }),
    // Twenty turns keeps cost predictable while staying long enough that the
    // assistant remembers what it just changed.
    messages: await convertToModelMessages(uiMessages.slice(-20)),
    tools: buildAssistantTools({ projectId, organizationId: org.id }),
    // Tool calls need a follow-up turn to report what changed; without this the
    // reply ends at the tool call and the user sees nothing.
    stopWhen: stepCountIs(5),
    temperature: 0.7,

    onFinish: async ({ text, usage, toolCalls }) => {
      await db.insert(assistantMessages).values({
        threadId: thread.id,
        role: 'assistant',
        content: text,
        toolCalls: toolCalls?.length ? toolCalls : null,
        model,
      })

      try {
        await db.insert(aiUsage).values({
          organizationId: org.id,
          projectId,
          feature: 'assistant',
          provider: 'openrouter',
          model,
          inputTokens: usage?.inputTokens ?? 0,
          outputTokens: usage?.outputTokens ?? 0,
          costUsd: '0',
          latencyMs: Date.now() - startedAt,
          status: 'success',
        })
      } catch (error) {
        // Telemetry must never break a reply the user already received.
        console.error('[assistant] failed to record usage', error)
      }
    },
  })

  return result.toUIMessageStreamResponse()
}

async function ensureThread(projectId: string) {
  const [existing] = await db
    .select()
    .from(assistantThreads)
    .where(eq(assistantThreads.projectId, projectId))
    .orderBy(desc(assistantThreads.createdAt))
    .limit(1)

  if (existing) return existing

  const [created] = await db
    .insert(assistantThreads)
    .values({ projectId, title: 'Brand refinement' })
    .returning()

  return created
}

/** UI messages carry parts rather than a plain string. */
function textOf(message: UIMessage) {
  return (message.parts ?? [])
    .filter((part) => part.type === 'text')
    .map((part) => (part as { text: string }).text)
    .join('\n')
}
