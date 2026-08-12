import 'server-only'

import { and, count, eq, inArray, isNotNull, ne } from 'drizzle-orm'
import { unstable_cache } from 'next/cache'
import { cache } from 'react'

import { db } from '@/server/db'
import { brandingAssets, generatedFiles, projects, websiteAssets } from '@/server/db/schema'

/** The cache tag for one site, so publishing can drop exactly its own entry. */
export function siteTag(host: string) {
  return `site:${host}`
}

/**
 * How long a published page may be stale.
 *
 * Five minutes. A customer's site is read far more often than it is edited,
 * and the two things that change it — publishing and attaching a domain —
 * both drop the tag directly, so this window only governs edits made outside
 * those paths. Short enough that nothing is wrong for long, long enough that
 * a page shared anywhere is served from cache rather than from a query.
 */
const SITE_TTL_SECONDS = 300

/**
 * A published customer site, addressed either by its Brandora subdomain or by
 * a domain the customer attached themselves.
 *
 * `proxy.ts` hands both forms to the same route segment, and they cannot
 * collide: the subdomain grammar forbids dots and a hostname always has one.
 *
 * Two caches, doing different jobs. `cache()` is per render, so the layout and
 * the page — which need different columns of the same row — share one query.
 * `unstable_cache` is across requests, and it is the one that matters here:
 * every visit to a published site read the database, which is the most public
 * surface this product has and was also the only one with no caching at all.
 *
 * The data rather than the page: the four pages are one route reading a path
 * segment, and caching the query gets what matters — the cross-region round
 * trip on every visit — without four separate cache entries holding four copies
 * of the same row.
 */
export const getPublishedSite = cache(async (host: string) => {
  const read = unstable_cache(
    async (target: string) => {
      const identifier = target.includes('.')
        ? eq(websiteAssets.customDomain, target)
        : eq(websiteAssets.subdomain, target)

      const [row] = await db
        .select({ website: websiteAssets, project: projects, branding: brandingAssets })
        .from(websiteAssets)
        .innerJoin(projects, eq(projects.id, websiteAssets.projectId))
        .leftJoin(brandingAssets, eq(brandingAssets.projectId, websiteAssets.projectId))
        .where(and(identifier, eq(websiteAssets.isPublished, true)))
        .limit(1)

      if (!row) return null

      /*
       * The images this site is allowed to show, read in the same cached entry.
       *
       * A separate query per image would put a cross-region round trip in the
       * path of every visitor — the thing caching this at all was meant to
       * remove. Resolved by kind rather than stored on the blocks, which is what
       * makes photography appear on a live site the day its owner buys a kit,
       * with no regeneration and no edit.
       */
      const files = await db
        .select({
          id: generatedFiles.id,
          kind: generatedFiles.kind,
          metadata: generatedFiles.metadata,
        })
        .from(generatedFiles)
        .where(
          and(
            eq(generatedFiles.projectId, row.website.projectId),
            inArray(generatedFiles.kind, ['social_scene', 'favicon', 'social_avatar']),
          ),
        )

      const variant = (name: string) =>
        files.find((file) => file.kind === 'social_avatar' && file.metadata?.variant === name)?.id

      const scenes: Partial<Record<'hero' | 'people' | 'detail', string>> = {}
      for (const file of files) {
        const scene = file.kind === 'social_scene' ? file.metadata?.scene : undefined
        if (scene === 'hero' || scene === 'people' || scene === 'detail') scenes[scene] = file.id
      }

      return {
        ...row,
        images: {
          scenes,
          logo: variant('transparent'),
          favicon: files.find((file) => file.kind === 'favicon')?.id,
          og: variant('og'),
        },
      }
    },
    ['published-site', host],
    { tags: [siteTag(host)], revalidate: SITE_TTL_SECONDS },
  )

  return read(host)
})

/**
 * How many of an organization's sites already carry a custom domain.
 *
 * Counted across the whole organization, not the project, because that is the
 * unit the plan sells: `maxCustomDomains` is one number for the account, and a
 * per-project count would let a Creator attach one domain per brand.
 *
 * `exceptProjectId` leaves out the project being edited. Replacing the domain
 * on a site that already has one is not a second domain, and without the
 * exclusion a Creator on their limit could never change the one they have.
 */
export async function countCustomDomains(
  organizationId: string,
  exceptProjectId?: string,
): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(websiteAssets)
    .innerJoin(projects, eq(projects.id, websiteAssets.projectId))
    .where(
      and(
        eq(projects.organizationId, organizationId),
        isNotNull(websiteAssets.customDomain),
        exceptProjectId ? ne(websiteAssets.projectId, exceptProjectId) : undefined,
      ),
    )

  return row?.total ?? 0
}
