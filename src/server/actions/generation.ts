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
