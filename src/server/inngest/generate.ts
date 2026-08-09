import { and, eq, inArray, lt, sql } from 'drizzle-orm'

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
import {
  CREDIT_COSTS,
  settleCredits,
  settleForContent,
  type GenerationSection,
} from '@/server/billing/credits'
import { generateLogos } from '@/server/services/logos'
import type { LayoutKind } from '@/server/render/layouts'
import { generateKitScenes, printKitPdf, renderKitPosts } from '@/server/services/social-kit'
import { isStorageConfigured } from '@/server/storage/r2'
import { db } from '@/server/db'
import {
  brandingAssets,
  contentItems,
  generationJobs,
  projects,
  socialMediaAssets,
  websiteAssets,
} from '@/server/db/schema'
import { findStuckContent } from '@/server/db/queries/content'
import { generateRequested, inngest } from './client'

/**
 * Marks one step's state on the job row. This is what the SSE stream tails.
 *
 * Merged in the database rather than in this process. It used to read the whole
 * `progress` object, change one key and write it all back — which is safe only
 * while exactly one step is running. The sections after branding run together
 * now, so two of them can read the same object and write it back a moment
 * apart, and the second one silently erases the first: a step that finished
 * shows "pending" for the rest of the run, on the panel whose whole job is
 * saying what is happening.
 *
 * `||` on jsonb merges shallowly, so the nested merge is spelled out: keep
 * whatever this step already had — `startedAt`, most importantly — and lay the
 * new fields over it. One statement, so concurrent writers cannot interleave.
 */
async function markStep(
  jobId: string,
  step: string,
  status: 'running' | 'done' | 'failed',
  error?: string,
) {
  const now = new Date().toISOString()

  const fields = {
    status,
    ...(status === 'running' ? { startedAt: now } : { finishedAt: now }),
    ...(error ? { error } : {}),
  }

  await db
    .update(generationJobs)
    .set({
      progress: sql`
        coalesce(${generationJobs.progress}, '{}'::jsonb)
          || jsonb_build_object(
               ${step}::text,
               coalesce(${generationJobs.progress} -> ${step}, '{}'::jsonb) || ${JSON.stringify(fields)}::jsonb
             )
      `,
    })
    .where(eq(generationJobs.id, jobId))
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

    /*
     * Content Studio's holds are swept here too, rather than by a second cron.
     * The lesson is the same one — a hold with nothing left to release it is
     * money owed that only a clock will notice — and it is worth having in one
     * place.
     *
     * Fifteen minutes, not ninety. Content generation runs inside a single
     * request under a 60-second timeout, so anything still `generating` a
     * quarter of an hour later is not slow, it is gone.
     */
    const stuckContent = await step.run('find-content', () => findStuckContent(15))

    for (const item of stuckContent) {
      await step.run(`release-content-${item.id}`, async () => {
        await settleForContent({
          organizationId: item.organizationId,
          reserved: item.creditsReserved,
          used: 0,
          projectId: item.projectId,
          contentItemId: item.id,
        })

        await db
          .update(contentItems)
          .set({
            status: 'failed',
            creditsCharged: 0,
            error: 'The generation never reported back. Credits were returned automatically.',
            updatedAt: new Date(),
          })
          .where(eq(contentItems.id, item.id))

        console.warn(`[credits] released a stuck hold on content ${item.id}`)
      })
    }

    return { released: stuck.length, contentReleased: stuckContent.length }
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
      /*
       * The three that follow branding run together, because none of them
       * needs another one's output.
       *
       * They used to run in file order, which meant the website waited for the
       * logos — and the logos are the long pole by a wide margin: four concepts
       * drawn, vectorised, rasterised at three sizes and uploaded, where the
       * website and the social copy are one model call each. So a customer sat
       * watching "website" spin for minutes while nothing about the website was
       * happening. Whatever the run costs now, it is the slowest section rather
       * than the sum of all of them.
       *
       * `allSettled`, not `all`: these already record their own outcome and a
       * failed website must not take a finished set of logos down with it.
       * Inngest memoises each `step.run` separately, so a replay after any one
       * of them still skips the work that has already been done.
       */
      /*
       * Handed in rather than closed over. `branding` is a `let` that starts
       * null, and a closure cannot keep the narrowing the `if` above proved —
       * so the parameter is the non-null one, and shadows it inside each.
       */
      const outcomes = await Promise.allSettled([
        runLogos(branding),
        runWebsite(branding),
        runSocial(branding),
      ])

      // Surfaced rather than swallowed: each helper already caught its own
      // failure, so anything arriving here is a bug in the helper itself.
      for (const outcome of outcomes) {
        if (outcome.status === 'rejected') {
          console.error('[generate] a section threw past its own handler', outcome.reason)
        }
      }

      async function runLogos(branding: BrandingOutput) {
        if (!requested.includes('logos')) return
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

      async function runWebsite(branding: BrandingOutput) {
        if (!requested.includes('website') || !project.needsWebsite) return
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

      async function runSocial(branding: BrandingOutput) {
        if (!requested.includes('social') || !project.needsSocialMedia) return
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

        /*
         * One post per step, because that is the only shape measured to work.
         *
         * Rendering several inside one invocation failed three different ways
         * — one post then a hang, four then a screenshot the browser could not
         * allocate, three then "target page, context or browser has been
         * closed" — while single renders through the probe route went six for
         * six. A browser is launched per image and the memory does not survive
         * being asked for several in a row.
         *
         * A step is also the retry unit, so one bad image is retried alone
         * rather than taking its neighbours with it, and none of this costs
         * money to repeat.
         */
        const layouts: LayoutKind[] = [
          'hero', 'feature', 'statement', 'detail', 'story', 'about', 'palette', 'identity',
        ]

        /*
         * One failing post does not lose the others.
         *
         * A run that drew six posts and then lost the browser on the seventh
         * threw all six away and refunded the customer, which is the worst of
         * both: no kit, and a wasted wait. The logo step learned this already —
         * each concept stands alone. Chromium is living inside a 2GB function
         * and will occasionally be killed; the kit should survive that rather
         * than be defined by it.
         */
        const drawn: string[] = []

        for (const [index, layout] of layouts.entries()) {
          try {
            await step.run(`kit-post-${layout}`, () =>
              renderKitPosts({ projectId, scenes, only: [layout], replace: index === 0 }),
            )
            drawn.push(layout)
          } catch (error) {
            console.warn(`[kit] ${layout} could not be drawn`, error)
          }
        }

        // Half a kit is not a kit. Below that it is worth failing and giving
        // the credits back rather than handing over something unusable.
        if (drawn.length < layouts.length / 2) {
          throw new Error(
            `Only ${drawn.length} of ${layouts.length} posts could be drawn.`,
          )
        }

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
