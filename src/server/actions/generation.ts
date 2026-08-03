'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { orgAction } from '@/server/actions/safe-action'
import { db } from '@/server/db'
import { projects } from '@/server/db/schema'
import { startGeneration } from '@/server/services/generation'

export const generateProject = orgAction
  .metadata({ name: 'generate-project' })
  .inputSchema(z.object({ projectId: z.uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const result = await startGeneration({
      organizationId: ctx.orgId,
      userId: ctx.user.id,
      projectId: parsedInput.projectId,
      emailVerified: ctx.user.emailVerified,
    })

    revalidatePath('/[locale]/dashboard', 'layout')
    return result
  })


/**
 * Regenerates just the logo concepts, using the currently chosen business name.
 *
 * Separate from a full generation because picking a name is the moment a
 * customer most wants new logos, and paying for branding, website and social
 * copy again to get them would be absurd.
 */
/**
 * Regenerates the logos, optionally with new direction from the customer.
 *
 * Saving the direction and starting the run are one action on purpose. As two
 * buttons, the common outcome was direction typed, "regenerate" pressed, and
 * the text left unsaved — so the run ignored exactly what it was asked for and
 * cost credits to produce the same logos again.
 */
export const regenerateLogos = orgAction
  .metadata({ name: 'regenerate-logos' })
  .inputSchema(z.object({ projectId: z.uuid(), brief: z.string().trim().max(600).optional() }))
  .action(async ({ parsedInput, ctx }) => {
    if (parsedInput.brief !== undefined) {
      await db
        .update(projects)
        .set({ logoBrief: parsedInput.brief || null, updatedAt: new Date() })
        .where(
          and(
            eq(projects.id, parsedInput.projectId),
            eq(projects.organizationId, ctx.orgId),
          ),
        )
    }

    const result = await startGeneration({
      organizationId: ctx.orgId,
      userId: ctx.user.id,
      projectId: parsedInput.projectId,
      emailVerified: ctx.user.emailVerified,
      only: ['logos'],
    })

    revalidatePath('/[locale]/dashboard', 'layout')
    return result
  })
