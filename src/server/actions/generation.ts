'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { orgAction } from '@/server/actions/safe-action'
import { AppError } from '@/lib/errors'
import { db } from '@/server/db'
import { brandingAssets, projects } from '@/server/db/schema'
import { getOrgPlan } from '@/server/db/queries/plans'
import { sectionsCarryingName, startGeneration } from '@/server/services/generation'

/*
 * Long enough to stop being a limit anyone writes into. It is a bound rather
 * than none at all because the text goes into a model prompt and a database
 * column, and neither should accept an unbounded paste.
 */
const MAX_BRIEF = 8000

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
  .inputSchema(z.object({ projectId: z.uuid(), brief: z.string().trim().max(MAX_BRIEF).optional() }))
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

/**
 * Renames the brand and redraws what carried the old name, as one act.
 *
 * The product's documented limit is that renaming updates the record and not
 * the work — so the customer is told that at the moment they rename, and given
 * the choice rather than a footnote. `selectBusinessName` remains exactly as it
 * was for the answer that only saves the name; this is the other answer.
 *
 * One action rather than two client calls, for the reason `regenerateLogos`
 * gives above: as separate presses the common outcome is the name saved and the
 * run started against the old one, which is the exact failure this exists to
 * prevent. The name is written first because the run reads it from this row.
 */
export const renameAndRegenerate = orgAction
  .metadata({ name: 'rename-and-regenerate' })
  .inputSchema(z.object({ projectId: z.uuid(), name: z.string().trim().min(2).max(60) }))
  .action(async ({ parsedInput, ctx }) => {
    const [project] = await db
      .select()
      .from(projects)
      .where(
        and(eq(projects.id, parsedInput.projectId), eq(projects.organizationId, ctx.orgId)),
      )
      .limit(1)

    if (!project) throw new AppError('NOT_FOUND', 'Project not found.')

    const only = sectionsCarryingName(project)

    if (only.length === 0) {
      throw new AppError('VALIDATION', 'There is nothing here that carries the name yet.')
    }

    await db
      .update(projects)
      .set({ businessName: parsedInput.name, updatedAt: new Date() })
      .where(eq(projects.id, parsedInput.projectId))

    try {
      const result = await startGeneration({
        organizationId: ctx.orgId,
        userId: ctx.user.id,
        projectId: parsedInput.projectId,
        emailVerified: ctx.user.emailVerified,
        only,
      })

      revalidatePath('/[locale]/dashboard', 'layout')
      return result
    } catch (error) {
      /*
       * The name is saved and the run was refused — no credits, an unverified
       * address, a run already in flight. That is precisely the "save name
       * only" outcome, so the page has to show the new name rather than leave
       * the customer reading an error beside the old one and assuming nothing
       * happened. The refusal is still theirs to see, so it is rethrown.
       */
      revalidatePath('/[locale]/dashboard', 'layout')
      throw error
    }
  })

/**
 * Builds the social kit for a project.
 *
 * Separate from the first pass because a kit is drawn around the logo the
 * customer chose, and at the moment the first pass runs nobody has chosen
 * anything yet. Requiring a choice first is also what makes the kit worth its
 * credits — it is built from a decision, not from a guess.
 */
export const generateSocialKit = orgAction
  .metadata({ name: 'generate-social-kit' })
  .inputSchema(z.object({ projectId: z.uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const [branding] = await db
      .select({ primaryLogoFileId: brandingAssets.primaryLogoFileId })
      .from(brandingAssets)
      .innerJoin(projects, eq(projects.id, brandingAssets.projectId))
      .where(
        and(
          eq(brandingAssets.projectId, parsedInput.projectId),
          eq(projects.organizationId, ctx.orgId),
        ),
      )
      .limit(1)

    if (!branding?.primaryLogoFileId) {
      throw new AppError('VALIDATION', 'Choose a logo first — the kit is built around it.')
    }

    /*
     * Enforced here as well as hidden in the UI, because a client can always
     * send the request anyway. Every other entitlement in this codebase is
     * checked server-side for the same reason.
     */
    const plan = await getOrgPlan(ctx.orgId)
    if (!plan?.socialMediaKit) {
      throw new AppError('FEATURE_LOCKED', 'The social kit is available on Pro and above.')
    }

    const result = await startGeneration({
      organizationId: ctx.orgId,
      userId: ctx.user.id,
      projectId: parsedInput.projectId,
      emailVerified: ctx.user.emailVerified,
      only: ['kit'],
    })

    revalidatePath('/[locale]/dashboard', 'layout')
    return result
  })

