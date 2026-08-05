import 'server-only'

import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm'

import { db } from '@/server/db'
import { brandingAssets, generatedFiles, projects } from '@/server/db/schema'
import type { BrandFonts, BrandPalette } from '@/lib/brand-theme'
import type { Project } from '@/server/db/schema'

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

/**
 * A project plus the parts of its brand needed to render it as itself.
 *
 * The lists used to show a title, a meta line and two colour dots, which is a
 * database row wearing a card. A specimen carries the mark, the ground it is
 * drawn on and the palette, so a page of them reads as the work rather than as
 * an inventory of it.
 */
export type BrandSpecimen = {
  project: Project
  palette: BrandPalette
  fonts: BrandFonts
  slogan: string | null
  /** The chosen mark, or the first one generated while the choice is pending. */
  logo: { id: string; r2Key: string } | null
}

export async function listBrandSpecimens(
  organizationId: string,
  limit?: number,
): Promise<BrandSpecimen[]> {
  const rows = await listProjects(organizationId, limit)
  if (rows.length === 0) return []

  const ids = rows.map((project) => project.id)

  /*
   * Three bounded queries rather than one join. The mark is whichever concept
   * the customer chose, and that choice lives on the branding row while the
   * file lives on another — a single left join could only reach the chosen one,
   * so every project still deciding would render blank. Resolving in memory
   * lets an undecided project fall back to its first concept.
   */
  const [branding, logos] = await Promise.all([
    db.select().from(brandingAssets).where(inArray(brandingAssets.projectId, ids)),
    db
      .select({
        id: generatedFiles.id,
        projectId: generatedFiles.projectId,
        r2Key: generatedFiles.r2Key,
      })
      .from(generatedFiles)
      .where(
        and(inArray(generatedFiles.projectId, ids), eq(generatedFiles.kind, 'logo_raster')),
      ),
  ])

  const brandingByProject = new Map(branding.map((row) => [row.projectId, row]))

  return rows.map((project) => {
    const brand = brandingByProject.get(project.id)
    const candidates = logos.filter((file) => file.projectId === project.id)
    const chosen = candidates.find((file) => file.id === brand?.primaryLogoFileId)

    return {
      project,
      palette: brand?.colorPalette ?? null,
      fonts: brand?.fontRecommendations ?? null,
      slogan: brand?.slogan ?? null,
      logo: chosen ?? candidates[0] ?? null,
    }
  })
}

export async function countProjects(organizationId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(projects)
    .where(and(eq(projects.organizationId, organizationId), isNull(projects.deletedAt)))

  return row?.value ?? 0
}

