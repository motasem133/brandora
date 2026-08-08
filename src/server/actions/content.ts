'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { BUILT_CONTENT_TYPES, MAX_BRIEF, MAX_VARIANTS } from '@/lib/content'
import { orgAction } from '@/server/actions/safe-action'
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
