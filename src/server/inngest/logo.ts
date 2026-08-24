import 'server-only'

import { and, eq, sql } from 'drizzle-orm'

import { db } from '@/server/db'
import { generatedFiles } from '@/server/db/schema'
import type { LayoutKind } from '@/server/render/layouts'
import { kitPostsOf, renderKitPosts, type SceneKeys } from '@/server/services/social-kit'
import { inngest, logoChanged } from './client'

/**
 * Redrawing the kit's posts after the logo changed.
 *
 * Choosing a mark rebuilt the favicon, the avatars, the OG card, the monochrome
 * version and the ZIP — and left the eight social posts carrying the previous
 * logo forever. That is the defect a customer reported as "the carousel is not
 * using the logo I chose": half of it is the renderer destroying the artwork
 * (fixed in `markPlate`), and this is the other half, where the artwork is a
 * logo they replaced weeks ago.
 *
 * Not part of the action that makes the choice, deliberately. Each post is a
 * Chromium launch of roughly ten seconds, and the choice already blocks for
 * about eighteen while the ZIP is rebuilt. A queue is where that belongs.
 *
 * Nothing here spends credits. The photography is reused, the copy is already
 * written, and every byte is one the customer has already paid for.
 */
/**
 * Which of the kit's posts this project has, by layout.
 *
 * A project that never generated a kit has none, and nothing is drawn for it:
 * the posts are part of what a kit costs, and handing one over here would give
 * it away.
 */
export async function staleKitLayouts(projectId: string): Promise<LayoutKind[]> {
  const rows = await db
    .select({ metadata: generatedFiles.metadata })
    .from(generatedFiles)
    /* The kit's own posts. A carousel's frames are also `social_post` and are
       not redrawn: they are a piece the customer may already have published,
       and rewriting one after the fact would change something they have seen
       and used. */
    .where(kitPostsOf(projectId))

  return rows
    .map((row) => row.metadata?.layout)
    .filter((layout): layout is LayoutKind => typeof layout === 'string')
}

/** The photography these posts were built on, reused rather than reshot. */
export async function scenesOf(projectId: string): Promise<SceneKeys> {
  const rows = await db
    .select({ r2Key: generatedFiles.r2Key, metadata: generatedFiles.metadata })
    .from(generatedFiles)
    .where(and(eq(generatedFiles.projectId, projectId), eq(generatedFiles.kind, 'social_scene')))

  const keys: SceneKeys = {}
  for (const row of rows) {
    const scene = row.metadata?.scene as 'hero' | 'people' | 'detail' | undefined
    if (scene) keys[scene] = row.r2Key
  }
  return keys
}

/**
 * One post, drawn again from the mark the customer now has.
 *
 * The replacement is written before its predecessor is deleted. The object key
 * is deterministic, so the new render overwrites the same object; dropping the
 * row first would leave the customer looking at a gap for the ten seconds this
 * takes, and anything that threw in that window would leave it a gap for good.
 */
export async function redrawLayout(
  projectId: string,
  scenes: SceneKeys,
  layout: LayoutKind,
): Promise<number> {
  const stale = await db
    .select({ id: generatedFiles.id })
    .from(generatedFiles)
    .where(and(kitPostsOf(projectId), sql`${generatedFiles.metadata}->>'layout' = ${layout}`))

  const result = await renderKitPosts({ projectId, scenes, only: [layout], replace: false })
  if (result.files.length === 0) return 0

  for (const row of stale) {
    await db.delete(generatedFiles).where(eq(generatedFiles.id, row.id))
  }

  return result.files.length
}

export const redrawKitPosts = inngest.createFunction(
  {
    id: 'redraw-kit-posts',
    triggers: [logoChanged],
    /* One project's redraw at a time, and two per account: a customer trying
       four marks in a row must not queue thirty-two browser launches. */
    concurrency: [
      { key: 'event.data.projectId', limit: 1 },
      { key: 'event.data.organizationId', limit: 2 },
    ],
    /* The last event wins. Choosing three logos in a minute should redraw the
       third, not all three in turn. */
    debounce: { key: 'event.data.projectId', period: '30s' },
    retries: 1,
  },
  async ({ event, step }) => {
    const { projectId } = event.data

    const existing = await step.run('what-exists', () => staleKitLayouts(projectId))
    if (existing.length === 0) return { redrawn: 0, reason: 'no kit posts' as const }

    const scenes = await step.run('scenes', () => scenesOf(projectId))

    /*
     * One step per post, and one failing post does not lose the others — the
     * same rule the kit's own step follows, for the same reason: Chromium lives
     * in a 2GB function and is occasionally killed.
     */
    const redrawn: LayoutKind[] = []

    for (const layout of existing) {
      try {
        await step.run(`redraw-${layout}`, () => redrawLayout(projectId, scenes, layout))
        redrawn.push(layout)
      } catch (error) {
        console.warn(`[logo] ${layout} could not be redrawn`, error)
      }
    }

    return { redrawn: redrawn.length }
  },
)
