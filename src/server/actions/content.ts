'use server'

import { and, count, eq, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { BUILT_CONTENT_TYPES, MAX_BRIEF, MAX_VARIANTS } from '@/lib/content'
import { orgAction } from '@/server/actions/safe-action'
import { db } from '@/server/db'
import { contentItems } from '@/server/db/schema'
import { generateContentItem } from '@/server/services/content'

const generateContentSchema = z.object({
  projectId: z.uuid(),
  /*
   * The row id, minted by the browser before it submits. Two clicks send the
   * same id, the insert conflicts, and the second one buys nothing — which is
   * the same trick the ledger uses on its idempotency key rather than a second
   * mechanism bolted on top.
   */
  contentItemId: z.uuid(),
  type: z.enum(BUILT_CONTENT_TYPES),
  brief: z.string().trim().min(3).max(MAX_BRIEF),
  tone: z.string().trim().max(80).nullish(),
  variants: z.number().int().min(1).max(MAX_VARIANTS),
})

/**
 * How many pieces are still being made for this workspace.
 *
 * Rendered types finish minutes after the request that asked for them, and
 * nothing told the page: the library kept saying "writing" while the project
 * page — rendered later, from the same row — showed the carousel finished. The
 * customer's only way out was to reload something.
 *
 * A count rather than the rows. The page re-reads itself when this drops, so
 * returning the content would be a second copy of what it is about to fetch
 * properly, and one that could disagree with it.
 */
export const pendingContentCount = orgAction
  .metadata({ name: 'pending-content-count' })
  .inputSchema(z.object({ projectId: z.uuid().optional() }))
  .action(async ({ parsedInput, ctx }) => {
    const [row] = await db
      .select({ count: count() })
      .from(contentItems)
      .where(
        and(
          eq(contentItems.organizationId, ctx.orgId),
          eq(contentItems.status, 'generating'),
          isNull(contentItems.deletedAt),
          parsedInput.projectId ? eq(contentItems.projectId, parsedInput.projectId) : undefined,
        ),
      )

    return { generating: row?.count ?? 0 }
  })

export const generateContent = orgAction
  .metadata({ name: 'generate-content' })
  .inputSchema(generateContentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await generateContentItem({
      organizationId: ctx.orgId,
      userId: ctx.user.id,
      projectId: parsedInput.projectId,
      contentItemId: parsedInput.contentItemId,
      type: parsedInput.type,
      brief: parsedInput.brief,
      tone: parsedInput.tone ?? null,
      variants: parsedInput.variants,
      emailVerified: ctx.user.emailVerified,
    })

    revalidatePath('/[locale]/dashboard', 'layout')

    return result
  })
