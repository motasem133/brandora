import 'server-only'

import { and, desc, eq, sql } from 'drizzle-orm'

import { env } from '@/lib/env'
import { AppError } from '@/lib/errors'
import { creditsForSections, reserveCredits, type GenerationSection } from '@/server/billing/credits'
import { db } from '@/server/db'
import {
  brandingAssets,
  generatedFiles,
  generationJobs,
  projects,
  socialMediaAssets,
  websiteAssets,
} from '@/server/db/schema'
import { inngest } from '@/server/inngest/client'
import { findStuckJobs, releaseHold } from '@/server/services/stuck-holds'
import { isStorageConfigured } from '@/server/storage/r2'

/**
 * Which steps a generation will run.
 *
 * Logos are included only when image generation and storage are both
 * configured — otherwise the step would reserve six credits and then fail,
 * and a refund the user never asked for is worse than not offering it.
 */
export function sectionsForProject(project: {
  needsWebsite: boolean
  needsSocialMedia: boolean
}): GenerationSection[] {
  const sections: GenerationSection[] = ['branding']
  if (isLogoGenerationAvailable()) sections.push('logos')
  if (project.needsWebsite) sections.push('website')
  if (project.needsSocialMedia) sections.push('social')
  /*
   * The kit is built from the chosen logo, so it cannot run in the same pass
   * that generates the concepts — nothing has been chosen yet. It is requested
   * explicitly, from the project page, once there is a logo to build on.
   */
  return sections
}

/**
 * What pressing the button should actually run.
 *
 * "Retry" on a part-finished run used to mean the whole plan again. A brand
 * whose website alone failed cost nine credits to recover a one-credit
 * section — and it did not only overcharge, it overwrote: the branding, logos
 * and social copy that had all succeeded were regenerated on top of
 * themselves, so pressing the button lost work as well as money.
 *
 * Missing sections are decided from the stored output, not from the last job's
 * progress. Job bookkeeping does not survive its own edge case: a section retry
 * writes `completed` to the project even though it only ran one section, so a
 * brand still missing its website reads as finished a moment later. What is on
 * disk cannot drift like that.
 *
 * When nothing is missing the whole plan runs, which is what a press means on a
 * brand that is already complete.
 */
export async function sectionsToRun(
  projectId: string,
  plan: GenerationSection[],
): Promise<GenerationSection[]> {
  const [branding, website, social, logo] = await Promise.all([
    db.select({ id: brandingAssets.id }).from(brandingAssets).where(eq(brandingAssets.projectId, projectId)).limit(1),
    db.select({ id: websiteAssets.id }).from(websiteAssets).where(eq(websiteAssets.projectId, projectId)).limit(1),
    db.select({ id: socialMediaAssets.id }).from(socialMediaAssets).where(eq(socialMediaAssets.projectId, projectId)).limit(1),
    db
      .select({ id: generatedFiles.id })
      .from(generatedFiles)
      .where(and(eq(generatedFiles.projectId, projectId), eq(generatedFiles.kind, 'logo_raster')))
      .limit(1),
  ])

  const present: Record<GenerationSection, boolean> = {
    branding: branding.length > 0,
    logos: logo.length > 0,
    website: website.length > 0,
    social: social.length > 0,
    // The kit is never in a default plan; it is asked for explicitly.
    kit: true,
  }

  const missing = plan.filter((section) => !present[section])
  return missing.length > 0 ? missing : plan
}

export function isLogoGenerationAvailable() {
  return Boolean(env.FAL_KEY) && isStorageConfigured()
}

/**
 * Whether the pipeline is currently failing to collect the work it is given.
 *
 * Runs are handed to Inngest and picked up within seconds. When that delivery
 * breaks — no app synced to this deployment, keys missing, the wrong
 * environment answering — nothing throws: the event is accepted and no worker
 * ever comes. Every customer who presses the button in that window pays for a
 * run that will not happen and watches a spinner until a clock refunds them.
 *
 * So the evidence is read from the jobs themselves rather than from a health
 * check on Inngest, which would only tell us whether the service is up and not
 * whether *our* functions are reachable. A job that has been sitting for three
 * minutes without starting is already far outside normal.
 *
 * The second half is what stops this latching on forever: if anything has
 * started since the newest undelivered job, delivery is working again and this
 * clears itself. No flag to reset, no state to get stuck.
 */
export async function deliveryLooksBroken(): Promise<boolean> {
  const rows = await db.execute<{
    undelivered: number
    newest_undelivered: Date | null
    last_started: Date | null
  }>(sql`
    SELECT
      count(*) FILTER (WHERE started_at IS NULL AND created_at < now() - interval '3 minutes')
        AS undelivered,
      max(created_at) FILTER (WHERE started_at IS NULL AND created_at < now() - interval '3 minutes')
        AS newest_undelivered,
      max(started_at) AS last_started
    FROM generation_jobs
    WHERE created_at > now() - interval '60 minutes'
  `)

  const row = rows[0]
  if (!row || Number(row.undelivered) === 0) return false

  return !row.last_started || row.last_started < row.newest_undelivered!
}

export async function getLatestJobForProject(projectId: string) {
  const [job] = await db
    .select()
    .from(generationJobs)
    .where(eq(generationJobs.projectId, projectId))
    .orderBy(desc(generationJobs.createdAt))
    .limit(1)

  return job ?? null
}

/**
 * Creates the job row, reserves credits, and emits the Inngest event.
 *
 * Credits are reserved before the event is sent: if the reservation fails the
 * user is told immediately rather than watching a job start and then die.
 */
export async function startGeneration(params: {
  organizationId: string
  userId: string
  projectId: string
  emailVerified: boolean
  /** Overrides the default plan, e.g. regenerating only the logos. */
  only?: GenerationSection[]
}) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, params.projectId), eq(projects.organizationId, params.organizationId)))
    .limit(1)

  if (!project) throw new AppError('NOT_FOUND', 'Project not found.')

  if (project.status === 'queued' || project.status === 'generating') {
    /*
     * A run that was never delivered leaves the project reading as busy
     * forever, and this guard then refuses the one action that would recover
     * it — so the customer is locked out of their own brand with their credits
     * held, and only an operator can free them. That is exactly what happened
     * to the first two customers who generated after the Inngest app stopped
     * being synced to production.
     *
     * So a hold that the sweeper would already consider dead is released here
     * and the new run proceeds. The check is the same one the sweeper uses, so
     * the two cannot disagree about what "stuck" means, and `settleCredits` is
     * keyed on the job id, so a late refund from either side is a no-op.
     */
    const stuck = await findStuckJobs()
    const mine = stuck.find((job) => job.projectId === project.id)

    if (!mine) {
      throw new AppError('GENERATION_IN_PROGRESS', 'This project is already generating.')
    }

    await releaseHold(
      mine.id,
      params.organizationId,
      project.id,
      'The run never started. Credits were returned and the brand was queued again.',
    )
  }

  // Free credits are the obvious abuse target, so verification gates spending
  // rather than sign-in.
  if (!params.emailVerified) {
    throw new AppError('EMAIL_NOT_VERIFIED', 'Please verify your email address to generate.')
  }

  /*
   * Checked before a single credit moves, which is the whole point of its
   * position here. Refusing to sell is the cheapest possible failure: the
   * customer keeps their balance and reads an honest sentence, rather than
   * paying for a run nobody will collect and finding out ten minutes later.
   */
  if (await deliveryLooksBroken()) {
    throw new AppError(
      'GENERATION_UNAVAILABLE',
      'Generation is temporarily unavailable, so nothing was charged. Please try again shortly.',
    )
  }

  const sections = params.only?.length
    ? params.only
    : await sectionsToRun(project.id, sectionsForProject(project))
  const cost = creditsForSections(sections)

  const [job] = await db
    .insert(generationJobs)
    .values({
      projectId: project.id,
      trigger:
        params.only?.length || sections.length < sectionsForProject(project).length
          ? 'retry_section'
          : 'initial',
      sections,
      progress: Object.fromEntries(sections.map((s) => [s, { status: 'pending' }])),
      status: 'queued',
      creditsReserved: cost,
    })
    .returning()

  try {
    await reserveCredits({
      organizationId: params.organizationId,
      amount: cost,
      projectId: project.id,
      generationJobId: job.id,
    })
  } catch (error) {
    // Roll the job back so a failed reservation leaves no orphaned queued row.
    await db.delete(generationJobs).where(eq(generationJobs.id, job.id))
    throw error
  }

  await db.update(projects).set({ status: 'queued' }).where(eq(projects.id, project.id))

  /*
   * If the event cannot even be handed over, the run is not going to happen —
   * so give the credits straight back rather than leaving a queued row for a
   * clock to find half an hour later. The customer sees a failure they can act
   * on, with their balance intact.
   */
  try {
    await inngest.send({
      name: 'brand/generate.requested',
      data: {
        projectId: project.id,
        jobId: job.id,
        organizationId: params.organizationId,
        sections,
      },
    })
  } catch (error) {
    await releaseHold(
      job.id,
      params.organizationId,
      project.id,
      'The run could not be queued. Credits were returned automatically.',
    )
    console.error('[generation] could not send the generate event', error)
    throw new AppError(
      'GENERATION_UNAVAILABLE',
      'Could not start the run. Your credits were not taken.',
    )
  }

  return { jobId: job.id, creditsReserved: cost, sections }
}
