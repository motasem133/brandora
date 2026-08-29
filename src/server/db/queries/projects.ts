import 'server-only'

import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm'

import { db } from '@/server/db'
import {
  brandingAssets,
  generatedFiles,
  projects,
  socialMediaAssets,
  websiteAssets,
} from '@/server/db/schema'
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
  /*
   * What this brand is still missing, so a wall can say so without opening it.
   *
   * Read from what exists rather than from what was asked for: `needsWebsite`
   * records a request, and a request that was refused by the plan or failed in
   * the pipeline is not a website. These two are what the paid tiers sell, and
   * a customer who cannot see the gap from the wall has to open a brand to find
   * it.
   */
  missing: { website: boolean; kit: boolean }
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
  const [branding, logos, sites, kitPosts] = await Promise.all([
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
    /* Two more bounded reads on the same id set, for the same reason as above:
       one row per project at most, and no join that could drop a project. */
    db
      .select({ projectId: websiteAssets.projectId })
      .from(websiteAssets)
      .where(inArray(websiteAssets.projectId, ids)),
    db
      .select({ projectId: generatedFiles.projectId })
      .from(generatedFiles)
      .where(
        and(inArray(generatedFiles.projectId, ids), eq(generatedFiles.kind, 'social_post')),
      ),
  ])

  const hasSite = new Set(sites.map((row) => row.projectId))
  const hasKit = new Set(kitPosts.map((row) => row.projectId))

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
      missing: { website: !hasSite.has(project.id), kit: !hasKit.has(project.id) },
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


/**
 * Exactly what the brand rail needs, and nothing the page already loads.
 *
 * The rail lives in a layout and the artefacts live in the page, so the two
 * cannot share one fetch without hoisting the page's whole fan-out into the
 * layout. This is the cheaper half of that trade: a handful of counts over
 * indexed columns, deliberately not the assets themselves.
 *
 * The counts are what make a rail worth having. "Logo" tells you a section
 * exists; "Logo · 4 files" tells you whether it is worth opening, which is the
 * question someone returning to a brand a week later is actually asking.
 */
export async function getBrandRail(organizationId: string, projectId: string) {
  const project = await getProject(organizationId, projectId)
  if (!project) return null

  const [files, branding, website, social] = await Promise.all([
    db
      .select({ id: generatedFiles.id, kind: generatedFiles.kind, r2Key: generatedFiles.r2Key })
      .from(generatedFiles)
      .where(eq(generatedFiles.projectId, project.id)),
    db
      .select({
        palette: brandingAssets.colorPalette,
        fonts: brandingAssets.fontRecommendations,
        story: brandingAssets.brandStory,
        primaryLogoId: brandingAssets.primaryLogoFileId,
      })
      .from(brandingAssets)
      .where(eq(brandingAssets.projectId, project.id))
      .limit(1),
    db
      .select({ pages: websiteAssets.pages, published: websiteAssets.isPublished })
      .from(websiteAssets)
      .where(eq(websiteAssets.projectId, project.id))
      .limit(1),
    db
      .select({ bio: socialMediaAssets.instagramBio })
      .from(socialMediaAssets)
      .where(eq(socialMediaAssets.projectId, project.id))
      .limit(1),
  ])

  const brand = branding[0]
  const palette = brand?.palette as Record<string, string> | null | undefined
  const fonts = brand?.fonts as Record<string, string> | null | undefined

  const logoFiles = files.filter((file) => file.kind === 'logo_raster')
  /* The chosen mark, or the first one generated while the choice is pending —
     the same fallback the specimen list uses, so the rail and the card never
     disagree about which mark represents a brand. */
  const logo =
    logoFiles.find((file) => file.id === brand?.primaryLogoId) ?? logoFiles[0] ?? null

  return {
    project,
    palette: (brand?.palette ?? null) as BrandPalette,
    logo,
    logos: logoFiles.length,
    kit: files.filter((file) => file.kind === 'social_post').length,
    colours: palette ? Object.values(palette).filter(Boolean).length : 0,
    fonts: fonts ? Object.values(fonts).filter(Boolean).length : 0,
    hasStory: Boolean(brand?.story),
    hasCopy: Boolean(social[0]?.bio),
    sitePages: Object.keys((website[0]?.pages ?? {}) as Record<string, unknown>).length,
    published: Boolean(website[0]?.published),
  }
}
