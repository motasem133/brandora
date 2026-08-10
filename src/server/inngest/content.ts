import 'server-only'

import { and, eq } from 'drizzle-orm'

import { CAROUSEL_FRAMES, type CarouselFrame } from '@/lib/content'
import { contentCarouselPrompt, contentCarouselSystem, PROMPT_VERSIONS } from '@/server/ai/prompts'
import { contentCarouselSchemaFor } from '@/server/ai/schemas'
import { runModel } from '@/server/ai/run'
import { settleForContent } from '@/server/billing/credits'
import { db } from '@/server/db'
import { brandingAssets, contentItems, generatedFiles, projects } from '@/server/db/schema'
import { LAYOUTS, type LayoutKind } from '@/server/render/layouts'
import { renderKitPosts, type SceneKeys } from '@/server/services/social-kit'
import { carouselRequested, inngest } from './client'

/**
 * The order frames are considered in.
 *
 * A sequence, not a set: the opening earns the swipe, the middle carries the
 * argument, and the mark closes it. `story` is deliberately absent — it is the
 * 1080×1920 layout, and a portrait frame in a square carousel is cropped by
 * every client that shows it.
 */
const FRAME_ORDER: LayoutKind[] = [
  'hero',
  'statement',
  'feature',
  'detail',
  'about',
  'identity',
  'palette',
]

/**
 * Which layouts this project can actually fill.
 *
 * Three of them need a photograph, and photography is the only part of a kit
 * that costs money — so a carousel reuses what the kit already generated
 * rather than reshooting. A project with no kit is not refused: it gets the
 * layouts that need no photograph, which is three of them, and the model is
 * asked for that many frames rather than five it cannot draw.
 */
async function availableLayouts(projectId: string) {
  const scenes = await db
    .select({ r2Key: generatedFiles.r2Key, metadata: generatedFiles.metadata })
    .from(generatedFiles)
    .where(and(eq(generatedFiles.projectId, projectId), eq(generatedFiles.kind, 'social_scene')))

  const keys: SceneKeys = {}
  for (const file of scenes) {
    const scene = file.metadata?.scene as 'hero' | 'people' | 'detail' | undefined
    if (scene) keys[scene] = file.r2Key
  }

  const usable = FRAME_ORDER.filter((layout) => {
    const needs = LAYOUTS[layout].needs
    return !needs || Boolean(keys[needs])
  })

  return { scenes: keys, layouts: usable.slice(0, CAROUSEL_FRAMES) }
}

export const generateCarousel = inngest.createFunction(
  {
    id: 'generate-carousel',
    triggers: [carouselRequested],
    concurrency: [{ key: 'event.data.organizationId', limit: 2 }],
    retries: 1,
    /*
     * The customer's credits are held from the moment they pressed the button,
     * so a run that dies for good has to give them back without being asked —
     * the same contract the brand pipeline honours. `settleForContent` is keyed
     * on the item id, so this and the catch below cannot both refund.
     */
    onFailure: async ({ event }) => {
      const { contentItemId, organizationId, projectId } = event.data.event.data

      const [item] = await db
        .select({ reserved: contentItems.creditsReserved })
        .from(contentItems)
        .where(eq(contentItems.id, contentItemId))
        .limit(1)

      await settleForContent({
        organizationId,
        reserved: item?.reserved ?? 0,
        used: 0,
        projectId,
        contentItemId,
      })

      await db
        .update(contentItems)
        .set({
          status: 'failed',
          creditsCharged: 0,
          error: 'The carousel could not be made. Nothing was charged.',
          updatedAt: new Date(),
        })
        .where(eq(contentItems.id, contentItemId))
    },
  },
  async ({ event, step }) => {
    const { contentItemId, projectId, organizationId } = event.data

    const [row] = await db
      .select({ item: contentItems, project: projects, branding: brandingAssets })
      .from(contentItems)
      .innerJoin(projects, eq(projects.id, contentItems.projectId))
      .innerJoin(brandingAssets, eq(brandingAssets.projectId, projects.id))
      .where(eq(contentItems.id, contentItemId))
      .limit(1)

    if (!row) return { skipped: 'no such item' as const }

    const { scenes, layouts } = await step.run('layouts', () => availableLayouts(projectId))

    /*
     * The words first, and only for the frames that can be drawn. Asking for
     * five and rendering three would charge for a sequence whose argument has
     * holes in it.
     */
    const copy = await step.run('copy', async () =>
      runModel({
        task: 'social',
        schema: contentCarouselSchemaFor(layouts.length),
        system: contentCarouselSystem(row.project.language),
        prompt: contentCarouselPrompt({
          project: {
            industry: row.project.industry,
            country: row.project.country,
            brandBrief: row.project.brandBrief,
            brandStyle: row.project.brandStyle,
            businessName: row.project.businessName,
            preferredColors: row.project.preferredColors,
            language: row.project.language,
          },
          branding: row.branding,
          chosenName: row.project.businessName,
          brief: row.item.brief ?? '',
          tone: row.item.tone,
          frames: layouts.length,
        }),
        context: { organizationId, projectId, feature: 'content' },
      }),
    )

    /*
     * Rendering reuses the kit's own loop rather than a second copy of it —
     * same layouts, same typography, same photographs, different source for
     * the words. `replace: false` and the item id keep it from touching the
     * kit's posts or overwriting their object keys.
     */
    const rendered = await step.run('render', () =>
      renderKitPosts({
        projectId,
        scenes,
        only: layouts,
        replace: false,
        contentItemId,
        copy: Object.fromEntries(
          layouts.map((layout, index) => [
            layout,
            /* `tail` is the accent-coloured end of a headline in these
               layouts, not a second line, so nothing is put in it. */
            { lead: copy.frames[index].lead, tail: null },
          ]),
        ),
      }),
    )

    if (rendered.files.length === 0) {
      throw new Error('No frames could be rendered for this carousel.')
    }

    const frames: CarouselFrame[] = rendered.files.map((file) => ({
      fileId: file.fileId,
      layout: file.layout,
      lead: file.copy?.lead ?? '',
    }))

    await step.run('finish', async () => {
      await db
        .update(contentItems)
        .set({
          status: 'ready',
          title: copy.title,
          body: { kind: 'carousel', frames, caption: copy.caption, hashtags: copy.hashtags },
          creditsCharged: row.item.creditsReserved,
          modelUsed: 'social',
          promptVersion: PROMPT_VERSIONS.contentCarousel,
          updatedAt: new Date(),
        })
        .where(eq(contentItems.id, contentItemId))

      /* Reserved equals used. Called anyway, so the ledger records a settle for
         every hold rather than only for the ones that changed. */
      await settleForContent({
        organizationId,
        reserved: row.item.creditsReserved,
        used: row.item.creditsReserved,
        projectId,
        contentItemId,
      })
    })

    return { frames: frames.length }
  },
)
