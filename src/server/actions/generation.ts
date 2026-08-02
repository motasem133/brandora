'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { orgAction } from '@/server/actions/safe-action'
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
export const regenerateLogos = orgAction
  .metadata({ name: 'regenerate-logos' })
  .inputSchema(z.object({ projectId: z.uuid() }))
  .action(async ({ parsedInput, ctx }) => {
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
