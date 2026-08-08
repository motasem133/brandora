import 'server-only'

import { and, count, eq, isNotNull, ne } from 'drizzle-orm'
import { cache } from 'react'

import { db } from '@/server/db'
import { brandingAssets, projects, websiteAssets } from '@/server/db/schema'

/**
 * A published customer site, addressed either by its Brandora subdomain or by
 * a domain the customer attached themselves.
 *
 * `proxy.ts` hands both forms to the same route segment, and they cannot
 * collide: the subdomain grammar forbids dots and a hostname always has one.
 *
 * Wrapped in `cache()` so the site layout and the page it wraps — which need
 * different columns of the same row — share a single query per render.
 */
export const getPublishedSite = cache(async (host: string) => {
  const identifier = host.includes('.')
    ? eq(websiteAssets.customDomain, host)
    : eq(websiteAssets.subdomain, host)

  const [row] = await db
    .select({ website: websiteAssets, project: projects, branding: brandingAssets })
    .from(websiteAssets)
    .innerJoin(projects, eq(projects.id, websiteAssets.projectId))
    .leftJoin(brandingAssets, eq(brandingAssets.projectId, websiteAssets.projectId))
    .where(and(identifier, eq(websiteAssets.isPublished, true)))
    .limit(1)

  return row ?? null
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
