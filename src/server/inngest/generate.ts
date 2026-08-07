import { and, eq, inArray, lt } from 'drizzle-orm'

import { brandingTask } from '@/server/ai/models'
import {
  brandingPrompt,
  brandingSystem,
  PROMPT_VERSIONS,
  socialPrompt,
  socialSystem,
  websitePrompt,
  websiteSystem,
} from '@/server/ai/prompts'
import { runModel } from '@/server/ai/run'
import { brandingSchema, socialSchema, websiteSchema, type BrandingOutput } from '@/server/ai/schemas'
import { CREDIT_COSTS, settleCredits, type GenerationSection } from '@/server/billing/credits'
import { generateLogos } from '@/server/services/logos'
import { generateKitScenes, printKitPdf, renderKitPosts } from '@/server/services/social-kit'
import { isStorageConfigured } from '@/server/storage/r2'
import { db } from '@/server/db'
import {
  brandingAssets,
  generationJobs,
  projects,
  socialMediaAssets,
  websiteAssets,
} from '@/server/db/schema'
import { generateRequested, inngest } from './client'

/** Marks one step's state on the job row. This is what the SSE stream tails. */
async function markStep(
  jobId: string,
  step: string,
  status: 'running' | 'done' | 'failed',
  error?: string,
) {
  const [job] = await db.select().from(generationJobs).where(eq(generationJobs.id, jobId)).limit(1)
  if (!job) return

  const progress = { ...job.progress }
  const existing = progress[step] ?? { status: 'pending' }

  progress[step] = {
    ...existing,
    status,
    ...(status === 'running' ? { startedAt: new Date().toISOString() } : {}),
    ...(status !== 'running' ? { finishedAt: new Date().toISOString() } : {}),
    ...(error ? { error } : {}),
  }

  await db.update(generationJobs).set({ progress }).where(eq(generationJobs.id, jobId))
}

/**
 * Releases the hold when the run itself dies.
 *
 * Credits are taken up front by `startGeneration` and given back by the
 * `settle` step at the end. That covers a section failing — the usual case,
 * and the reason most runs end with a refund. It does not cover the run never
 * reaching `settle` at all: an unhandled throw outside the per-section
 * try/catch, a timeout, all retries exhausted, or the function never being
 * delivered because the Inngest app is pointed somewhere else.
 *
 * That last one is not hypothetical. A preview deployment registered itself as
 * this app and answered production's events against a different database; the
 * run never started, the job sat at `queued`, and seven credits stayed taken
 * with no refund row to show for them. Nothing in the product could give them
 * back, because nothing knew they were owed.
 *
 * `settleCredits` is keyed on the job id, so this and the `settle` step cannot
 * both refund — whichever runs first wins and the other is a no-op. That makes
 * this safe to run on a failure that happened *after* a successful settle.
 */
async function releaseHold(jobId: string, organizationId: string, projectId: string, reason: string) {
  const [job] = await db.select().from(generationJobs).where(eq(generationJobs.id, jobId)).limit(1)
  if (!job) return

  await settleCredits({
    organizationId,
    reserved: job.creditsReserved,
    // Nothing finished, so nothing is charged. A run that got far enough to
    // complete a section will have settled honestly in `settle` already, and
    // the idempotency key makes this call fall through.
    used: 0,
    projectId,
    generationJobId: jobId,
  })

  await db
    .update(generationJobs)
    .set({ status: 'failed', creditsCharged: 0, error: reason, finishedAt: new Date() })
    .where(eq(generationJobs.id, jobId))

  await db.update(projects).set({ status: 'failed' }).where(eq(projects.id, projectId))
}

/**
 * Gives back holds on runs that never reported anything at all.
 *
 * `onFailure` covers a run that started and died. It cannot cover a run that
 * was never delivered: with no execution there is no failure to hook, so the
 * job sits at `queued` and the credits sit with it. The only thing that
 * notices is a clock.
 *
 * Ninety minutes because the longest honest run observed is about four, and a
 * job stuck an order of magnitude past that is stuck. Erring long is
 * deliberate — refunding a run that is merely slow would hand back credits
 * while the work is still being paid for downstream.
 */
export const releaseStuckHolds = inngest.createFunction(
  // Same shape as the function below: Inngest 4 takes triggers in the config
  // rather than as a second positional argument.
  { id: 'release-stuck-holds', triggers: [{ cron: '*/30 * * * *' }] },
  async ({ step }) => {
    const stuck = await step.run('find', async () => {
      const cutoff = new Date(Date.now() - 90 * 60 * 1000)

      return db
        .select({
          id: generationJobs.id,
          projectId: generationJobs.projectId,
          organizationId: projects.organizationId,
          createdAt: generationJobs.createdAt,
        })
        .from(generationJobs)
        .innerJoin(projects, eq(projects.id, generationJobs.projectId))
        .where(
          and(
            inArray(generationJobs.status, ['queued', 'running']),
            lt(generationJobs.createdAt, cutoff),
          ),
        )
    })

    for (const job of stuck) {
      await step.run(`release-${job.id}`, async () => {
        await releaseHold(
          job.id,
          job.organizationId,
          job.projectId,
          'The run never reported back. Credits were returned automatically.',
        )
        console.warn(`[credits] released a stuck hold on job ${job.id}`)
      })
    }

    return { released: stuck.length }
  },
)

export const generateBrand = inngest.createFunction(
  {
    id: 'generate-brand',
    triggers: [generateRequested],
    // One organization cannot starve the queue for everyone else.
    concurrency: [{ key: 'event.data.organizationId', limit: 2 }],
    retries: 2,
    /*
     * Runs once, after the final retry has failed. The customer gets their
     * credits back without having to ask, and the job stops claiming to be
     * running forever.
     */
    onFailure: async ({ event, error }) => {
      const { jobId, organizationId, projectId } = event.data.event.data
      await releaseHold(
        jobId,
        organizationId,
        projectId,
        error?.message?.slice(0, 500) ?? 'The generation run failed.',
      )
    },
  },
  async ({ event, step }) => {
    const { projectId, jobId, organizationId, sections } = event.data
    const requested = sections as GenerationSection[]

    await step.run('start', async () => {
      await db
        .update(generationJobs)
        .set({ status: 'running', startedAt: new Date() })
        .where(eq(generationJobs.id, jobId))
      await db.update(projects).set({ status: 'generating' }).where(eq(projects.id, projectId))
    })

    const project = await step.run('load-project', async () => {
      const [row] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
      if (!row) throw new Error(`Project ${projectId} not found`)
      return row
    })

    const usageContext = { organizationId, projectId, generationJobId: jobId }
    const completed: GenerationSection[] = []
    const failed: GenerationSection[] = []

    /*
     * Branding blocks everything downstream on purpose: website copy and social
     * captions must reference the chosen name, voice and palette. Generating
     * them concurrently would produce three mutually inconsistent brands.
     */
    let branding: BrandingOutput | null = null

    if (requested.includes('branding')) {
      try {
        branding = await step.run('branding', async () => {
          await markStep(jobId, 'branding', 'running')

          const output = await runModel({
            task: brandingTask(project.language),
            schema: brandingSchema,
            system: brandingSystem(project.language),
            prompt: brandingPrompt(project),
            context: { ...usageContext, feature: 'branding' },
          })

          await db
            .insert(brandingAssets)
            .values({
              projectId,
              businessNameIdeas: output.businessNameIdeas,
              slogan: output.slogan,
              brandStory: output.brandStory,
              colorPalette: output.colorPalette,
              fontRecommendations: output.fontRecommendations,
              brandValues: output.brandValues,
              brandVoice: output.brandVoice,
              modelUsed: brandingTask(project.language),
              promptVersion: PROMPT_VERSIONS.branding,
            })
            .onConflictDoUpdate({
              target: brandingAssets.projectId,
              set: {
                businessNameIdeas: output.businessNameIdeas,
                slogan: output.slogan,
                brandStory: output.brandStory,
                colorPalette: output.colorPalette,
                fontRecommendations: output.fontRecommendations,
                brandValues: output.brandValues,
                brandVoice: output.brandVoice,
                updatedAt: new Date(),
              },
            })

          await markStep(jobId, 'branding', 'done')
          return output
        })

        completed.push('branding')
      } catch (error) {
        await markStep(jobId, 'branding', 'failed', errorMessage(error))
        failed.push('branding')
      }
    }

    /*
     * A partial run — regenerating only the logos, say — never produced a
     * branding object in this execution, so load the stored one. Without this
     * the run would find nothing to ground itself in and quietly do nothing.
     */
    if (!branding && !requested.includes('branding')) {
      branding = await step.run('load-branding', async () => {
        const [stored] = await db
          .select()
          .from(brandingAssets)
          .where(eq(brandingAssets.projectId, projectId))
          .limit(1)

        if (!stored) throw new Error('This project has no branding to build on.')

        return {
          businessNameIdeas: stored.businessNameIdeas,
          slogan: stored.slogan ?? '',
          brandStory: stored.brandStory ?? '',
          colorPalette: stored.colorPalette!,
          fontRecommendations: stored.fontRecommendations!,
          brandValues: stored.brandValues,
          brandVoice: stored.brandVoice ?? '',
        } as BrandingOutput
      })
    }

    // Without branding there is nothing to ground the other sections in.
    if (branding) {
      if (requested.includes('logos')) {
        try {
          await step.run('logos', async () => {
            await markStep(jobId, 'logos', 'running')

            if (!isStorageConfigured()) {
              throw new Error('R2 storage is not configured, so logos cannot be stored.')
            }

            const result = await generateLogos({
              projectId,
              organizationId,
              generationJobId: jobId,
              project,
              branding,
            })

            await markStep(jobId, 'logos', 'done')
            return result
          })

          completed.push('logos')
        } catch (error) {
          await markStep(jobId, 'logos', 'failed', errorMessage(error))
          failed.push('logos')
        }
      }

      if (requested.includes('website') && project.needsWebsite) {
        try {
          await step.run('website', async () => {
            await markStep(jobId, 'website', 'running')

            const output = await runModel({
              task: 'website',
              schema: websiteSchema,
              system: websiteSystem(project.language),
              prompt: websitePrompt(project, branding),
              context: { ...usageContext, feature: 'website' },
            })

            await db
              .insert(websiteAssets)
              .values({
                projectId,
                template: 'modern',
                pages: output,
                // customStyles is deliberately left empty: it holds only explicit
                // builder overrides. Copying the palette here would freeze the
                // site on colours that go stale the moment branding is
                // regenerated.
                customStyles: {},
              })
              .onConflictDoUpdate({
                target: websiteAssets.projectId,
                set: { pages: output, updatedAt: new Date() },
              })

            await markStep(jobId, 'website', 'done')
          })

          completed.push('website')
        } catch (error) {
          await markStep(jobId, 'website', 'failed', errorMessage(error))
          failed.push('website')
        }
      }

      if (requested.includes('social') && project.needsSocialMedia) {
        try {
          await step.run('social', async () => {
            await markStep(jobId, 'social', 'running')

            const output = await runModel({
              task: 'social',
              schema: socialSchema,
              system: socialSystem(project.language),
              prompt: socialPrompt(project, branding),
              context: { ...usageContext, feature: 'social' },
            })

            await db
              .insert(socialMediaAssets)
              .values({
                projectId,
                instagramBio: output.instagramBio,
                instagramPosts: output.instagramPosts,
                storyTemplates: output.storyTemplates,
                adCopy: output.adCopy,
                hashtags: output.hashtags,
              })
              .onConflictDoUpdate({
                target: socialMediaAssets.projectId,
                set: {
                  instagramBio: output.instagramBio,
                  instagramPosts: output.instagramPosts,
                  storyTemplates: output.storyTemplates,
                  adCopy: output.adCopy,
                  hashtags: output.hashtags,
                  updatedAt: new Date(),
                },
              })

            await markStep(jobId, 'social', 'done')
          })

          completed.push('social')
        } catch (error) {
          await markStep(jobId, 'social', 'failed', errorMessage(error))
          failed.push('social')
        }
      }
    /*
     * The kit runs last, in three steps, and on its own terms.
     *
     * It is the only step that depends on a decision the customer made rather
     * than on model output — there has to be a chosen logo to build on — so it
     * is requested explicitly rather than being part of the first pass.
     *
     * Three steps because a step is what Inngest memoises. The photographs are
     * the only paid part and take about two and a half minutes each; printing
     * the PDF is seconds and free. Fused into one step, a failure while
     * printing would buy the photographs again on every retry, which is
     * exactly the loop the logo step once ran for four paid images.
     */
    if (requested.includes('kit')) {
      try {
        await markStep(jobId, 'kit', 'running')

        const scenes = await step.run('kit-scenes', () =>
          generateKitScenes({ projectId, organizationId, generationJobId: jobId }),
        )

        await step.run('kit-posts', () => renderKitPosts({ projectId, scenes }))
        await step.run('kit-pdf', () => printKitPdf({ projectId, scenes }))

        await markStep(jobId, 'kit', 'done')
        completed.push('kit')
      } catch (error) {
        await markStep(jobId, 'kit', 'failed', errorMessage(error))
        failed.push('kit')
      }
    }

    } else if (requested.includes('branding')) {
      // Branding failed, so anything depending on it is skipped rather than
      // attempted against a brand that does not exist.
      for (const section of requested) {
        if (section !== 'branding') {
          await markStep(jobId, section, 'failed', 'Skipped because branding failed.')
          failed.push(section)
        }
      }
    }

    return step.run('settle', async () => {
      const [job] = await db
        .select()
        .from(generationJobs)
        .where(eq(generationJobs.id, jobId))
        .limit(1)

      const used = completed.reduce((total, section) => total + CREDIT_COSTS[section], 0)

      // Users are never charged for a section that failed.
      await settleCredits({
        organizationId,
        reserved: job?.creditsReserved ?? 0,
        used,
        projectId,
        generationJobId: jobId,
      })

      const status =
        failed.length === 0 ? 'completed' : completed.length > 0 ? 'partial' : 'failed'

      await db
        .update(generationJobs)
        .set({ status, creditsCharged: used, finishedAt: new Date() })
        .where(eq(generationJobs.id, jobId))

      await db.update(projects).set({ status }).where(eq(projects.id, projectId))

      return { status, completed, failed, creditsCharged: used }
    })
  },
)

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error'
}
