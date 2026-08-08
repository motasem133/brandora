import 'server-only'

import { and, desc, eq, isNull, sql } from 'drizzle-orm'

import { db } from '@/server/db'
import { brandingAssets, contentItems, projects, type ContentItem } from '@/server/db/schema'

/**
 * Reads for Content Studio.
 *
 * Every function takes an organization id and filters on it. There is no
 * get-by-id that trusts the id in the URL, for the same reason `getProject`
 * does not have one: a missing tenant filter reads as a working page right up
 * until it shows someone else's content.
 */

/** A brand that has been generated, so it can ground content. */
export type StudioBrand = {
  id: string
  name: string
  updatedAt: Date
}

/**
 * The brands eligible to make content for.
 *
 * A project with no `branding_assets` row is excluded rather than shown and
 * rejected later: the entire premise is that the content already knows the
 * brand, and there is nothing to know yet.
 */
export async function listStudioBrands(organizationId: string): Promise<StudioBrand[]> {
  const rows = await db
    .select({
      id: projects.id,
      title: projects.title,
      businessName: projects.businessName,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .innerJoin(brandingAssets, eq(brandingAssets.projectId, projects.id))
    .where(and(eq(projects.organizationId, organizationId), isNull(projects.deletedAt)))
    .orderBy(desc(projects.updatedAt))
    .limit(50)

  return rows.map((row) => ({
    id: row.id,
    name: row.businessName || row.title,
    updatedAt: row.updatedAt,
  }))
}

export type ContentListItem = {
  id: string
  type: string
  status: string
  title: string | null
  brief: string | null
  /** Carried so a row can show its first line without a second query. */
  body: ContentItem['body']
  createdAt: Date
  creditsCharged: number
  projectId: string
  brandName: string
}

/**
 * The library: the newest version of each piece, newest first.
 *
 * Filtered to `isLatest` so a regenerated piece appears once rather than once
 * per attempt, and to `deletedAt IS NULL` for the soft delete.
 */
export async function listContent(
  organizationId: string,
  options: { projectId?: string; limit?: number } = {},
): Promise<ContentListItem[]> {
  const rows = await db
    .select({
      id: contentItems.id,
      type: contentItems.type,
      status: contentItems.status,
      title: contentItems.title,
      brief: contentItems.brief,
      body: contentItems.body,
      createdAt: contentItems.createdAt,
      creditsCharged: contentItems.creditsCharged,
      projectId: contentItems.projectId,
      projectTitle: projects.title,
      businessName: projects.businessName,
    })
    .from(contentItems)
    .innerJoin(projects, eq(projects.id, contentItems.projectId))
    .where(
      and(
        eq(contentItems.organizationId, organizationId),
        eq(contentItems.isLatest, true),
        isNull(contentItems.deletedAt),
        options.projectId ? eq(contentItems.projectId, options.projectId) : undefined,
      ),
    )
    .orderBy(desc(contentItems.createdAt))
    .limit(options.limit ?? 30)

  return rows.map(({ projectTitle, businessName, ...row }) => ({
    ...row,
    brandName: businessName || projectTitle,
  }))
}

/** Org-scoped read of one piece. Returns undefined rather than throwing. */
export async function getContentItem(organizationId: string, id: string) {
  const [row] = await db
    .select()
    .from(contentItems)
    .where(
      and(
        eq(contentItems.id, id),
        eq(contentItems.organizationId, organizationId),
        isNull(contentItems.deletedAt),
      ),
    )
    .limit(1)

  return row
}

/**
 * Holds left behind by a request that died between reserving and settling.
 *
 * Fifteen minutes, not the ninety the brand pipeline allows: content runs
 * inside a single request under a 60s timeout, so anything still `generating`
 * after this long is not slow, it is gone.
 */
export async function findStuckContent(olderThanMinutes = 15) {
  return db
    .select({
      id: contentItems.id,
      organizationId: contentItems.organizationId,
      projectId: contentItems.projectId,
      creditsReserved: contentItems.creditsReserved,
    })
    .from(contentItems)
    .where(
      and(
        eq(contentItems.status, 'generating'),
        sql`${contentItems.createdAt} < now() - make_interval(mins => ${olderThanMinutes})`,
      ),
    )
    .limit(100)
}
