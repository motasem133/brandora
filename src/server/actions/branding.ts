'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { AppError } from '@/lib/errors'
import { brandCopyPatch } from '@/lib/validations/brand'
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
 * Edits the brand's own words, by hand.
 *
 * Everything here was readable and not writable, on every plan. A customer who
 * wanted one word changed in their slogan had two routes: ask the Brand
 * Assistant, which is paid, or spend credits regenerating a whole section to
 * get a different result they did not ask for. The worst first impression this
 * product can make is a free user who likes everything except one line.
 *
 * No model is called and nothing is charged — this is the customer typing.
 * `brandCopyPatch` is the assistant's own contract, so a person and a model
 * editing the same field are held to the same bounds; see `validations/brand`.
 *
 * A patch rather than a field-and-value pair, because the row is one row: the
 * caller sends whichever fields it is changing and the rest are left alone.
 */
export const updateBrandCopy = orgAction
  .metadata({ name: 'update-brand-copy' })
  .inputSchema(z.object({ projectId: z.uuid(), patch: brandCopyPatch }))
  .action(async ({ parsedInput, ctx }) => {
    await assertOwnedProject(parsedInput.projectId, ctx.orgId)

    const [updated] = await db
      .update(brandingAssets)
      .set({ ...parsedInput.patch, updatedAt: new Date() })
      .where(eq(brandingAssets.projectId, parsedInput.projectId))
      .returning({ id: brandingAssets.id })

    /*
     * A project with no branding row is not an error the customer caused — the
     * run has not produced one yet — but it is not a success either, and
     * reporting one would leave an edit that silently went nowhere.
     */
    if (!updated) throw new AppError('NOT_FOUND', 'This project has no branding yet.')

    revalidatePath('/[locale]/dashboard', 'layout')
    return { fields: Object.keys(parsedInput.patch) }
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

    /*
     * Choosing a logo also resets the icon to follow it.
     *
     * The icon was left pointing wherever it pointed before, so picking a mark
     * from a later round quietly kept cutting the favicon and every avatar out
     * of a concept from two rounds ago — a choice nobody made and nothing on
     * the page reported. Following the logo is the answer that needs no
     * explanation; picking a text-free mark afterwards is the exception, and
     * the usage previews show which one is in force either way.
     */
    const [updated] = await db
      .update(brandingAssets)
      .set({ primaryLogoFileId: file.id, markLogoFileId: null, updatedAt: new Date() })
      .where(eq(brandingAssets.projectId, parsedInput.projectId))
      .returning({ id: brandingAssets.id })

    if (!updated) throw new AppError('NOT_FOUND', 'This project has no branding yet.')

    await rederivePrimaryAssets(parsedInput.projectId)

    revalidatePath('/[locale]/dashboard', 'layout')
    return { fileId: file.id }
  })
