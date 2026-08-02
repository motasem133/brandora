import 'server-only'

import { asc, desc, eq } from 'drizzle-orm'

import { db } from '@/server/db'
import { assistantMessages, assistantThreads } from '@/server/db/schema'

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
