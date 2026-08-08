import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from 'ai'
import { z } from 'zod'

import { env } from '@/lib/env'
import { assistantSystemPrompt, buildAssistantTools } from '@/server/ai/assistant'
import { MODELS } from '@/server/ai/models'
import {
  ensureThread,
  recordAssistantMessage,
  recordAssistantUsage,
  recordUserMessage,
} from '@/server/db/queries/assistant'
import { getOrgPlan } from '@/server/db/queries/plans'
import { getBrandContext, getProject } from '@/server/db/queries/projects'
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

  const { branding, social } = await getBrandContext(projectId)

  const thread = await ensureThread(projectId)
  const uiMessages = messages as UIMessage[]

  const latest = uiMessages.at(-1)
  if (latest?.role === 'user') {
    await recordUserMessage(thread.id, textOf(latest))
  }

  const startedAt = Date.now()
  const model = MODELS.assistant.primary

  const result = streamText({
    model: openrouter(model),
    system: assistantSystemPrompt({
      projectName: project.businessName || project.title,
      language: project.language,
      branding,
      social,
      hasSocial: Boolean(social),
      chosenName: project.businessName,
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
      await recordAssistantMessage({
        threadId: thread.id,
        content: text,
        toolCalls,
        model,
      })

      await recordAssistantUsage({
        organizationId: org.id,
        projectId,
        model,
        inputTokens: usage?.inputTokens ?? 0,
        outputTokens: usage?.outputTokens ?? 0,
        latencyMs: Date.now() - startedAt,
      })
    },
  })

  return result.toUIMessageStreamResponse()
}

/** UI messages carry parts rather than a plain string. */
function textOf(message: UIMessage) {
  return (message.parts ?? [])
    .filter((part) => part.type === 'text')
    .map((part) => (part as { text: string }).text)
    .join('\n')
}
