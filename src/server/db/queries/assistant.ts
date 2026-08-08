import 'server-only'

import { asc, desc, eq } from 'drizzle-orm'

import { db } from '@/server/db'
import { aiUsage, assistantMessages, assistantThreads } from '@/server/db/schema'

export type StoredMessage = {
  id: string
  role: 'user' | 'assistant'
  parts: { type: 'text'; text: string }[]
}

/**
 * Loads the conversation so the panel can resume where it left off.
 *
 * Tab switches are full navigations, so the chat component unmounts and its
 * in-memory state is gone. Without this, moving to the Branding tab and back
 * erased the conversation — the messages were in the database the whole time,
 * they were simply never read back.
 *
 * Tool messages are excluded: the assistant's own reply already states what it
 * changed, and a bare tool row without its result reads as noise.
 */
export async function getThreadMessages(projectId: string, limit = 50): Promise<StoredMessage[]> {
  const [thread] = await db
    .select({ id: assistantThreads.id })
    .from(assistantThreads)
    .where(eq(assistantThreads.projectId, projectId))
    .orderBy(desc(assistantThreads.createdAt))
    .limit(1)

  if (!thread) return []

  const rows = await db
    .select()
    .from(assistantMessages)
    .where(eq(assistantMessages.threadId, thread.id))
    .orderBy(asc(assistantMessages.createdAt))
    .limit(limit)

  return rows
    .filter((row) => row.role !== 'tool' && row.content.trim().length > 0)
    .map((row) => ({
      id: row.id,
      role: row.role === 'user' ? 'user' : 'assistant',
      parts: [{ type: 'text' as const, text: row.content }],
    }))
}

/**
 * The project's thread, created on first use.
 *
 * One thread per project is the product's model, so this reads the newest and
 * only writes when there is none. Lifted out of the route handler along with
 * the two message writes and the usage row: the chat endpoint held five raw
 * Drizzle calls, which is the whole reason a route could quietly grow its own
 * schema knowledge.
 */
export async function ensureThread(projectId: string) {
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

/**
 * Records the customer's turn before the model runs, so a generation that fails
 * still leaves the conversation intact rather than losing what they typed.
 */
export async function recordUserMessage(threadId: string, content: string) {
  await db.insert(assistantMessages).values({ threadId, role: 'user', content })
}

export async function recordAssistantMessage(params: {
  threadId: string
  content: string
  toolCalls?: unknown[] | null
  model: string
}) {
  await db.insert(assistantMessages).values({
    threadId: params.threadId,
    role: 'assistant',
    content: params.content,
    toolCalls: params.toolCalls?.length ? params.toolCalls : null,
    model: params.model,
  })
}

/**
 * Usage telemetry for one assistant reply.
 *
 * Swallows its own failure by design: the customer already has the reply, and
 * losing a metrics row is not a reason to fail a request that succeeded.
 */
export async function recordAssistantUsage(params: {
  organizationId: string
  projectId: string
  model: string
  inputTokens: number
  outputTokens: number
  latencyMs: number
}) {
  try {
    await db.insert(aiUsage).values({
      organizationId: params.organizationId,
      projectId: params.projectId,
      feature: 'assistant',
      provider: 'openrouter',
      model: params.model,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      costUsd: '0',
      latencyMs: params.latencyMs,
      status: 'success',
    })
  } catch (error) {
    console.error('[assistant] failed to record usage', error)
  }
}
