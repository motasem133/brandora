import 'server-only'

import { and, eq } from 'drizzle-orm'

import { CAROUSEL_FRAMES, STORY_LAYOUT, type CarouselFrame } from '@/lib/content'
import {
  contentCarouselPrompt,
  contentCarouselSystem,
  contentStoryPrompt,
  contentStorySystem,
  PROMPT_VERSIONS,
} from '@/server/ai/prompts'
import { contentCarouselSchemaFor, contentStorySchema } from '@/server/ai/schemas'
import { runModel } from '@/server/ai/run'
import { settleForContent } from '@/server/billing/credits'
import { db } from '@/server/db'
import { brandingAssets, contentItems, generatedFiles, projects } from '@/server/db/schema'
import { LAYOUTS, type LayoutKind } from '@/server/render/layouts'
import { renderKitPosts, type SceneKeys } from '@/server/services/social-kit'
import { renderedContentRequested, inngest } from './client'

/**
 * The order frames are considered in, before the closing frame is added.
 *
 * A sequence, not a set: the opening earns the swipe, the middle carries the
 * argument, and the mark closes it. `story` is deliberately absent — it is the
 * 1080×1920 layout, and a portrait frame in a square carousel is cropped by
 * every client that shows it.
 *
 * `identity` and `palette` are absent now too, and that is the fix rather than
 * an omission. Both are specimens — `LAYOUTS[…].copy` says `none`, they draw no
 * words at all — so every carousel that reached them spent a model call on a
 * line, charged for it, and dropped it at render time. A brand with no kit
 * photography could only reach those two, which is how "we are launching soon"
 * came back as a logo with no words and a sheet of hex codes. The sequence now
 * ends on `closing`, which is the frame that promise always needed.
 */
const FRAME_ORDER: LayoutKind[] = ['hero', 'statement', 'feature', 'detail', 'about']

/** Every frame in a carousel ends here: the mark, and the line that asks. */
const CLOSING_FRAME: LayoutKind = 'closing'

/**
 * Which layouts this project can actually fill.
 *
 * Most of them need a photograph, and photography is the only part of a kit
 * that costs money — so a carousel reuses what the kit already generated
 * rather than reshooting. A project with no kit is not refused: it gets the
 * frames that need no photograph, and the model is asked for exactly that many
 * lines rather than for lines nothing will draw.
 *
 * Every layout returned here carries copy. That is asserted rather than
 * assumed — see the filter below — because the alternative is what shipped:
 * frames planned out of layouts that cannot say anything.
 */
export function carouselPlan(scenes: SceneKeys): LayoutKind[] {
  const usable = FRAME_ORDER.filter((layout) => {
    const needs = LAYOUTS[layout].needs
    return LAYOUTS[layout].copy !== 'none' && (!needs || Boolean(scenes[needs]))
  })

  /* The closing frame is the last one and is always drawn: it needs no
     photograph, so it is the one frame every brand can end on. */
  return [...usable.slice(0, CAROUSEL_FRAMES - 1), CLOSING_FRAME]
}

/** The plan for one project, with the photography it has to draw from. */
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

  return { scenes: keys, layouts: carouselPlan(keys) }
}

export const generateRenderedContent = inngest.createFunction(
  {
    id: 'generate-rendered-content',
    triggers: [renderedContentRequested],
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
          error: 'It could not be drawn. Nothing was charged.',
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

    const brief = {
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
    }

    const context = { organizationId, projectId, feature: 'content' as const }

    /*
     * A story is one portrait frame; a carousel is a sequence of square ones.
     * Same pipeline, because two paths to the same artwork is how the two of
     * them start disagreeing about what a frame looks like — and because
     * everything either needs, from the hold to the refund, is identical.
     */
    const isStory = event.data.type === 'story'

    /* One shape for both, so the render and finish steps below do not have to
       know which type produced it. A story simply has no caption. */
    type Plan = {
      title: string
      lines: string[]
      layouts: string[]
      caption?: string
      hashtags?: string[]
    }

    const plan: Plan = isStory
      ? await step.run('copy', async () => {
          const out = await runModel({
            task: 'social',
            schema: contentStorySchema,
            system: contentStorySystem(row.project.language),
            prompt: contentStoryPrompt(brief),
            context,
          })
          return { title: out.title, lines: [out.lead], layouts: [STORY_LAYOUT] }
        })
      : await step.run('copy', async () => {
          const out = await runModel({
            task: 'social',
            schema: contentCarouselSchemaFor(layouts.length),
            system: contentCarouselSystem(row.project.language),
            prompt: contentCarouselPrompt({ ...brief, frames: layouts.length }),
            context,
          })
          return {
            title: out.title,
            lines: out.frames.map((frame) => frame.lead),
            layouts,
            caption: out.caption,
            hashtags: out.hashtags,
          }
        })

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
        only: plan.layouts as LayoutKind[],
        replace: false,
        contentItemId,
        copy: Object.fromEntries(
          plan.layouts.map((layout, index) => [
            layout,
            /* `tail` is the accent-coloured end of a headline in these
               layouts, not a second line, so nothing is put in it. */
            { lead: plan.lines[index], tail: null },
          ]),
        ),
      }),
    )

    if (rendered.files.length === 0) {
      throw new Error('Nothing could be drawn for this piece.')
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
          title: plan.title,
          body: isStory
            ? { kind: 'story', frames }
            : {
                kind: 'carousel',
                frames,
                /* Only a story reaches here without them, and a story never
                   takes this branch — but the column is typed, so say so. */
                caption: plan.caption ?? '',
                hashtags: plan.hashtags ?? [],
              },
          creditsCharged: row.item.creditsReserved,
          modelUsed: 'social',
          promptVersion: isStory ? PROMPT_VERSIONS.contentStory : PROMPT_VERSIONS.contentCarousel,
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
