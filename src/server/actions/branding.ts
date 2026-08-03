'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { AppError } from '@/lib/errors'
import { orgAction } from '@/server/actions/safe-action'
import { db } from '@/server/db'
import { brandingAssets, generatedFiles, projects } from '@/server/db/schema'
import { rederivePrimaryAssets } from '@/server/services/logos'

async function assertOwnedProject(projectId: string, orgId: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.organizationId, orgId)))
    .limit(1)

  if (!project) throw new AppError('NOT_FOUND', 'Project not found.')
  return project
}

/**
 * Commits to one of the generated name ideas.
 *
 * Until a name is chosen, everything downstream — logo prompts, website copy,
 * the brand kit — falls back to the first idea in the list. That is a sensible
 * default but a poor decision to make silently on the customer's behalf, so
 * choosing writes it to the project and the rest of the system follows.
 */
export const selectBusinessName = orgAction
  .metadata({ name: 'select-business-name' })
  .inputSchema(z.object({ projectId: z.uuid(), name: z.string().trim().min(2).max(60) }))
  .action(async ({ parsedInput, ctx }) => {
    await assertOwnedProject(parsedInput.projectId, ctx.orgId)

    await db
      .update(projects)
      .set({ businessName: parsedInput.name, updatedAt: new Date() })
      .where(eq(projects.id, parsedInput.projectId))

    revalidatePath('/[locale]/dashboard', 'layout')
    return { name: parsedInput.name }
  })

/**
 * Chooses which logo concept is the real one.
 *
 * Re-derives the favicon, avatars, OG card and monochrome mark from the chosen
 * concept and rebuilds the brand kit, so the downloadable assets match the
 * logo actually picked rather than whichever one happened to be generated
 * first. No model is called, so this costs nothing.
 */
export const selectPrimaryLogo = orgAction
  .metadata({ name: 'select-primary-logo' })
  .inputSchema(z.object({ projectId: z.uuid(), fileId: z.uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    await assertOwnedProject(parsedInput.projectId, ctx.orgId)

    const [file] = await db
      .select()
      .from(generatedFiles)
      .where(
        and(
          eq(generatedFiles.id, parsedInput.fileId),
          eq(generatedFiles.projectId, parsedInput.projectId),
          eq(generatedFiles.kind, 'logo_raster'),
        ),
      )
      .limit(1)

    if (!file) throw new AppError('NOT_FOUND', 'That logo does not belong to this project.')

    const [updated] = await db
      .update(brandingAssets)
      .set({ primaryLogoFileId: file.id, updatedAt: new Date() })
      .where(eq(brandingAssets.projectId, parsedInput.projectId))
      .returning({ id: brandingAssets.id })

    if (!updated) throw new AppError('NOT_FOUND', 'This project has no branding yet.')

    await rederivePrimaryAssets(parsedInput.projectId, file.r2Key)

    revalidatePath('/[locale]/dashboard', 'layout')
    return { fileId: file.id }
  })


