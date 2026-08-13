import 'server-only'

import { and, eq, inArray } from 'drizzle-orm'

import { db } from '@/server/db'
import { generatedFiles } from '@/server/db/schema'

/**
 * The pictures a project's website may show, resolved by kind.
 *
 * One function because there are two surfaces — the published site and the
 * builder's canvas — and they have now drifted apart three separate times: the
 * canvas rendered in the wrong typeface, then in the wrong palette, then with
 * no photographs at all while production was photo-led. Every one of those was
 * a customer being shown a preview of something other than their own site.
 *
 * Resolved by kind rather than stored on the blocks, which is what makes
 * photography appear on a live site the day its owner buys a kit, with no
 * regeneration and no edit. See the note in `block-renderer.tsx`.
 */
export type SiteImageSet = {
  scenes: Partial<Record<'hero' | 'people' | 'detail', string>>
  logo?: string
  favicon?: string
  og?: string
}

export async function siteImages(projectId: string): Promise<SiteImageSet> {
  const files = await db
    .select({
      id: generatedFiles.id,
      kind: generatedFiles.kind,
      metadata: generatedFiles.metadata,
    })
    .from(generatedFiles)
    .where(
      and(
        eq(generatedFiles.projectId, projectId),
        inArray(generatedFiles.kind, ['social_scene', 'favicon', 'social_avatar']),
      ),
    )

  const variant = (name: string) =>
    files.find((file) => file.kind === 'social_avatar' && file.metadata?.variant === name)?.id

  const scenes: SiteImageSet['scenes'] = {}
  for (const file of files) {
    const scene = file.kind === 'social_scene' ? file.metadata?.scene : undefined
    if (scene === 'hero' || scene === 'people' || scene === 'detail') scenes[scene] = file.id
  }

  return {
    scenes,
    logo: variant('transparent'),
    favicon: files.find((file) => file.kind === 'favicon')?.id,
    og: variant('og'),
  }
}
