import 'server-only'

import { eq } from 'drizzle-orm'

import { db } from '@/server/db'
import { brandingAssets, generatedFiles, projects } from '@/server/db/schema'
import { AppError } from '@/lib/errors'
import { signedDownloadUrl } from '@/server/storage/r2'
import { liftBackground, splitLockup, trim } from '@/server/services/logo-parts'
import { renderToPng } from './browser'
import { fontFace, squarePost, type PostBrand } from './post-template'

/**
 * A brand's real typeface, as bytes.
 *
 * Google's CSS API serves woff2 to a modern browser and TrueType to an old
 * one, and only TrueType goes into a `@font-face` data URI that Chromium will
 * accept without a fetch. Hence the antique user agent — it is load-bearing,
 * not cargo.
 */
const fontCache = new Map<string, Buffer | null>()

async function loadFont(family: string): Promise<Buffer | null> {
  if (fontCache.has(family)) return fontCache.get(family) ?? null

  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 6.1)' } },
    )
    const url = (await css.text()).match(/https:\/\/[^)]+/)?.[0]
    if (!url) throw new Error(`no source for ${family}`)

    const file = Buffer.from(await (await fetch(url)).arrayBuffer())
    fontCache.set(family, file)
    return file
  } catch (error) {
    // A missing face is a worse-looking post, not a failed one: Chromium falls
    // back and the render still carries the brand's colours, mark and words.
    console.warn(`[render] could not load "${family}"`, error)
    fontCache.set(family, null)
    return null
  }
}

async function readFile(key: string): Promise<Buffer> {
  const response = await fetch(await signedDownloadUrl(key))
  if (!response.ok) throw new Error(`Could not read ${key} (${response.status})`)
  return Buffer.from(await response.arrayBuffer())
}

/** Renders one square post for a project, as PNG bytes. */
export async function renderSocialPost(projectId: string, size = 1080) {
  const [row] = await db
    .select({
      title: projects.title,
      businessName: projects.businessName,
      industry: projects.industry,
      style: projects.brandStyle,
      palette: brandingAssets.colorPalette,
      fonts: brandingAssets.fontRecommendations,
      slogan: brandingAssets.slogan,
      primaryLogoFileId: brandingAssets.primaryLogoFileId,
    })
    .from(projects)
    .innerJoin(brandingAssets, eq(brandingAssets.projectId, projects.id))
    .where(eq(projects.id, projectId))
    .limit(1)

  if (!row) throw new AppError('NOT_FOUND', 'That project has no branding yet.')
  if (!row.primaryLogoFileId) throw new AppError('NOT_FOUND', 'No logo has been chosen yet.')

  const [logo] = await db
    .select({ r2Key: generatedFiles.r2Key })
    .from(generatedFiles)
    .where(eq(generatedFiles.id, row.primaryLogoFileId))
    .limit(1)

  if (!logo) throw new AppError('NOT_FOUND', 'The chosen logo is missing from storage.')

  /*
   * The chip wants the name alone and the ground wants the symbol alone —
   * which is exactly what the kit's own variants are. A logo that will not
   * split is trimmed instead, because placing the whole square in a chip
   * scales the empty margin and the mark lands as a dot.
   */
  const transparent = await liftBackground(await readFile(logo.r2Key))
  const parts = await splitLockup(transparent)
  const trimmed = parts ? null : await trim(transparent)

  const uri = (buffer: Buffer) => `data:image/png;base64,${buffer.toString('base64')}`

  const brand: PostBrand = {
    name: row.businessName || row.title,
    slogan: row.slogan,
    industry: row.industry,
    style: row.style,
    palette: row.palette ?? {
      primary: '#111827', secondary: '#6b7280', background: '#ffffff',
      text: '#111827', accent: '#2563eb',
    },
    fonts: {
      heading: row.fonts?.heading ?? 'Inter',
      body: row.fonts?.body ?? 'Inter',
    },
  }

  const families = [...new Set([brand.fonts.heading, brand.fonts.body])]
  const loaded = await Promise.all(families.map(async (f) => [f, await loadFont(f)] as const))
  const faces = loaded
    .filter((entry): entry is [string, Buffer] => entry[1] !== null)
    .map(([family, file]) => fontFace(family, file))
    .join('\n')

  const html = squarePost({
    brand,
    faces,
    size,
    wordmark: uri(parts ? parts.text.buffer : trimmed!),
    mark: uri(parts ? parts.icon.buffer : trimmed!),
  })

  return renderToPng(html, { width: size, height: size })
}
