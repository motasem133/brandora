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
import type {
  BrandingAsset,
  GeneratedFile,
  Project,
  SocialMediaAsset,
  WebsiteAsset,
} from '@/server/db/schema'

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

/**
 * Everything a run produced for one project.
 *
 * The three asset tables hold at most one row each per project, so they are
 * unwrapped here rather than handing four callers an array they all have to
 * remember to take `[0]` of.
 *
 * Not org-scoped, deliberately, and safe because it never resolves a project:
 * every caller has already passed `getProject`, which is org-scoped, and holds
 * a project it is entitled to. Taking an `organizationId` here would suggest
 * this performs the tenant check when it does not.
 */
export type ProjectAssets = {
  branding: BrandingAsset | null
  website: WebsiteAsset | null
  social: SocialMediaAsset | null
  files: GeneratedFile[]
}

export async function getProjectAssets(projectId: string): Promise<ProjectAssets> {
  const [branding, website, social, files] = await Promise.all([
    db.select().from(brandingAssets).where(eq(brandingAssets.projectId, projectId)).limit(1),
    db.select().from(websiteAssets).where(eq(websiteAssets.projectId, projectId)).limit(1),
    db.select().from(socialMediaAssets).where(eq(socialMediaAssets.projectId, projectId)).limit(1),
    db.select().from(generatedFiles).where(eq(generatedFiles.projectId, projectId)),
  ])

  return {
    branding: branding[0] ?? null,
    website: website[0] ?? null,
    social: social[0] ?? null,
    files,
  }
}

/**
 * The subset the assistant needs to describe the brand it is refining.
 *
 * Separate from `getProjectAssets` because this runs on every chat message and
 * the assistant never looks at the generated files or the website row; reusing
 * the wider query would buy two extra round trips per keystroke-batch.
 */
export async function getBrandContext(
  projectId: string,
): Promise<{ branding: BrandingAsset | null; social: SocialMediaAsset | null }> {
  const [branding, social] = await Promise.all([
    db.select().from(brandingAssets).where(eq(brandingAssets.projectId, projectId)).limit(1),
    db.select().from(socialMediaAssets).where(eq(socialMediaAssets.projectId, projectId)).limit(1),
  ])

  return { branding: branding[0] ?? null, social: social[0] ?? null }
}

/** The website row for a project, or null when the run never produced one. */
export async function getWebsiteAsset(projectId: string): Promise<WebsiteAsset | null> {
  const [website] = await db
    .select()
    .from(websiteAssets)
    .where(eq(websiteAssets.projectId, projectId))
    .limit(1)

  return website ?? null
}

/**
 * A generated file, resolved only if it belongs to the caller's organization.
 *
 * The join through `projects` **is** the authorisation, not a convenience: R2
 * object keys are guessable, so the bucket is private and this is the only gate
 * in front of it. It lived inside the file route handler, which is precisely
 * where a tenant check is easiest to forget when a second route wants the same
 * lookup.
 */
export type OrgFile = {
  r2Key: string
  kind: GeneratedFile['kind']
  mimeType: string
  width: number | null
  height: number | null
  metadata: Record<string, unknown>
  projectTitle: string
}

export async function getOrgFile(
  organizationId: string,
  fileId: string,
): Promise<OrgFile | null> {
  const [file] = await db
    .select({
      r2Key: generatedFiles.r2Key,
      kind: generatedFiles.kind,
      mimeType: generatedFiles.mimeType,
      width: generatedFiles.width,
      height: generatedFiles.height,
      metadata: generatedFiles.metadata,
      projectTitle: projects.title,
    })
    .from(generatedFiles)
    .innerJoin(projects, eq(projects.id, generatedFiles.projectId))
    .where(and(eq(generatedFiles.id, fileId), eq(projects.organizationId, organizationId)))
    .limit(1)

  return file ?? null
}

/**
 * The answers worth carrying into the next brand.
 *
 * Only what stays true between clients: the brief and the name are what make
 * each brand a different brand, so those always start empty.
 *
 * The return type is inferred rather than declared. Written by hand it said
 * `industry: string | null` against a `notNull` column and widened
 * `brandStyle` off its enum, which the wizard's prop then rejected — a
 * hand-written mirror of a schema is a second source of truth that is wrong
 * the moment the first one moves.
 */
export async function getLastProjectAnswers(organizationId: string) {
  const [previous] = await db
    .select({
      name: projects.businessName,
      title: projects.title,
      industry: projects.industry,
      country: projects.country,
      brandStyle: projects.brandStyle,
    })
    .from(projects)
    .where(eq(projects.organizationId, organizationId))
    .orderBy(desc(projects.createdAt))
    .limit(1)

  if (!previous) return null

  return {
    from: previous.name || previous.title,
    industry: previous.industry,
    country: previous.country,
    brandStyle: previous.brandStyle,
  }
}

/**
 * Display names for a set of project ids, as one query.
 *
 * The billing page needs these to say which brand a charge was spent on: a
 * ledger row carries a project id and used to show none of it, so "Generation
 * −8" was the entire account of where eight credits went.
 */
export async function getProjectNames(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map()

  const rows = await db
    .select({ id: projects.id, name: projects.businessName, title: projects.title })
    .from(projects)
    .where(inArray(projects.id, ids))

  return new Map(rows.map((row) => [row.id, row.name || row.title]))
}

export async function countProjects(organizationId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(projects)
    .where(and(eq(projects.organizationId, organizationId), isNull(projects.deletedAt)))

  return row?.value ?? 0
}

