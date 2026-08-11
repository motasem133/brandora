import 'server-only'

import { and, count, eq, isNotNull, ne } from 'drizzle-orm'
import { unstable_cache } from 'next/cache'
import { cache } from 'react'

import { db } from '@/server/db'
import { brandingAssets, projects, websiteAssets } from '@/server/db/schema'

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
 * The data rather than the page, because the page cannot be cached: it reads
 * `?page=` to decide which of the four to render, and a route that reads search
 * params is dynamic whatever `revalidate` says. Caching the query gets what
 * matters — the cross-region round trip on every visit — without turning the
 * page's navigation into four routes.
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

      return row ?? null
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
