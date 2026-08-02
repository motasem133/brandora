import 'server-only'

import { and, count, desc, eq, isNull } from 'drizzle-orm'

import { db } from '@/server/db'
import { projects } from '@/server/db/schema'

/**
 * Read queries. Every one takes an `organizationId` — there is deliberately no
 * "get project by id" that skips the tenant check.
 */

export async function listProjects(organizationId: string, limit?: number) {
  const query = db
    .select()
    .from(projects)
    .where(and(eq(projects.organizationId, organizationId), isNull(projects.deletedAt)))
    .orderBy(desc(projects.createdAt))

  return limit ? query.limit(limit) : query
}

export async function getProject(organizationId: string, projectId: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.organizationId, organizationId),
        isNull(projects.deletedAt),
      ),
    )
    .limit(1)

  return project ?? null
}

export async function countProjects(organizationId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(projects)
    .where(and(eq(projects.organizationId, organizationId), isNull(projects.deletedAt)))

  return row?.value ?? 0
}

export async function countProjectsByStatus(organizationId: string, status: 'completed') {
  const [row] = await db
    .select({ value: count() })
    .from(projects)
    .where(
      and(
        eq(projects.organizationId, organizationId),
        eq(projects.status, status),
        isNull(projects.deletedAt),
      ),
    )

  return row?.value ?? 0
}
