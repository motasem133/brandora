import { eq } from 'drizzle-orm'

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

export const generateBrand = inngest.createFunction(
  {
    id: 'generate-brand',
    triggers: [generateRequested],
    // One organization cannot starve the queue for everyone else.
    concurrency: [{ key: 'event.data.organizationId', limit: 2 }],
    retries: 2,
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
