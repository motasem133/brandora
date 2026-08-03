import 'server-only'

import { and, eq, inArray } from 'drizzle-orm'
import sharp from 'sharp'

import { generateLogoImage, LOGO_STYLES, logoPrompt, type LogoStyle } from '@/server/ai/image'
import type { ProjectBrief } from '@/server/ai/prompts'
import type { BrandingOutput } from '@/server/ai/schemas'
import { db } from '@/server/db'
import { brandingAssets, generatedFiles } from '@/server/db/schema'
import { objectKey, signedDownloadUrl, uploadObject } from '@/server/storage/r2'
import { buildBrandKit } from './brand-kit'
import { makeMonochrome, makeOgImage, rasterToSvg, resizePng } from './vectorize'

export const LOGO_COUNT = 4

type LogoResult = {
  style: LogoStyle
  fileId: string
  prompt: string
}

/**
 * Generates logo concepts, vectorises them, derives the supporting assets, and
 * packages the downloadable brand kit.
 *
 * Each concept is independent: one failing image does not lose the others, and
 * the caller is told how many succeeded so credits can be settled honestly.
 */
export async function generateLogos(params: {
  projectId: string
  organizationId: string
  generationJobId: string
  project: ProjectBrief
  branding: BrandingOutput
}) {
  const name = params.project.businessName || params.branding.businessNameIdeas[0].name
  const kitFiles = new Map<string, Buffer>()
  const results: LogoResult[] = []

  /*
   * Concepts accumulate in rounds rather than replacing what came before.
   *
   * Deleting them was how the "eight identical tiles" bug was fixed: object
   * keys were deterministic, so a second run overwrote the images in R2 while
   * leaving a second set of rows pointing at them. Numbering the round fixes
   * that at the source — every round writes its own objects — and a customer
   * who preferred the logo they had two attempts ago can still go back to it.
   */
  const existing = await db
    .select({ metadata: generatedFiles.metadata })
    .from(generatedFiles)
    .where(
      and(
        eq(generatedFiles.projectId, params.projectId),
        eq(generatedFiles.kind, 'logo_raster'),
      ),
    )

  // Rows written before rounds existed are round 1.
  const round =
    existing.reduce((highest, file) => Math.max(highest, Number(file.metadata?.round ?? 1)), 0) + 1

  /*
   * Only the derived assets are replaced. They are one favicon, one avatar set
   * and one OG card — the current ones, by definition — and they are rewritten
   * below from whichever concept is chosen.
   */
  await db
    .delete(generatedFiles)
    .where(
      and(
        eq(generatedFiles.projectId, params.projectId),
        inArray(generatedFiles.kind, ['favicon', 'social_avatar']),
      ),
    )

  const [before] = await db
    .select({ primaryLogoFileId: brandingAssets.primaryLogoFileId })
    .from(brandingAssets)
    .where(eq(brandingAssets.projectId, params.projectId))
    .limit(1)

  const settled = await Promise.allSettled(
    LOGO_STYLES.slice(0, LOGO_COUNT).map(async (style) => {
      const prompt = logoPrompt({ style, name, project: params.project, branding: params.branding })

      const raster = await generateLogoImage({
        prompt,
        organizationId: params.organizationId,
        projectId: params.projectId,
        generationJobId: params.generationJobId,
      })

      const slug = style.replace(/\s+/g, '-')

      // Measure rather than assume: the provider decides final dimensions.
      const meta = await sharp(raster).metadata()

      // Round in the key, or the new images would overwrite the old ones in R2
      // and every round would render as the newest one.
      const pngKey = objectKey(params.projectId, `logo-r${round}-${slug}.png`)
      await uploadObject({ key: pngKey, body: raster, contentType: 'image/png' })

      const [file] = await db
        .insert(generatedFiles)
        .values({
          projectId: params.projectId,
          kind: 'logo_raster',
          r2Key: pngKey,
          mimeType: 'image/png',
          sizeBytes: raster.byteLength,
          width: meta.width ?? null,
          height: meta.height ?? null,
          metadata: { style, prompt, round, brief: params.project.logoBrief ?? null },
        })
        .returning()

      kitFiles.set(`${slug}.png`, raster)

      // Vectorisation is best-effort: a logo that will not trace cleanly is
      // still a usable raster logo, so it must not fail the whole concept.
      try {
        const svg = await rasterToSvg(raster)
        const svgKey = objectKey(params.projectId, `logo-r${round}-${slug}.svg`)
        await uploadObject({ key: svgKey, body: svg, contentType: 'image/svg+xml' })

        await db.insert(generatedFiles).values({
          projectId: params.projectId,
          kind: 'logo_svg',
          r2Key: svgKey,
          mimeType: 'image/svg+xml',
          sizeBytes: Buffer.byteLength(svg),
          metadata: { style, tracedFrom: pngKey, round },
        })

        kitFiles.set(`${slug}.svg`, Buffer.from(svg))
      } catch (error) {
        console.warn(`[logos] vectorisation failed for ${slug}`, error)
      }

      return { style, fileId: file.id, prompt } satisfies LogoResult
    }),
  )

  for (const outcome of settled) {
    if (outcome.status === 'fulfilled') results.push(outcome.value)
    else console.warn('[logos] concept failed', outcome.reason)
  }

  if (results.length === 0) {
    throw new Error('Every logo concept failed to generate.')
  }

  await db
    .update(brandingAssets)
    .set({
      logoConcepts: results.map((r) => ({ fileId: r.fileId, prompt: r.prompt, style: r.style })),
      updatedAt: new Date(),
    })
    .where(eq(brandingAssets.projectId, params.projectId))

  /*
   * A logo the customer picked outlives a regeneration.
   *
   * They asked for more options, not for their choice to be overwritten — and
   * the favicon, avatars and brand kit are all derived from it, so silently
   * repointing them at a new concept would change a published site's icon
   * because someone clicked "regenerate" to look around.
   */
  const chosen = before?.primaryLogoFileId
    ? (
        await db
          .select({ r2Key: generatedFiles.r2Key })
          .from(generatedFiles)
          .where(eq(generatedFiles.id, before.primaryLogoFileId))
          .limit(1)
      )[0]
    : undefined

  if (chosen) {
    // Rebuilds the derived assets and the kit from the existing choice, which
    // costs nothing — no model is called.
    await rederivePrimaryAssets(params.projectId, chosen.r2Key)
    return { generated: results.length, requested: LOGO_COUNT }
  }

  // Nothing chosen yet: the newest round's first concept is the wordmark, which
  // is the one that works as an avatar and a favicon.
  const primary = kitFiles.get(`${results[0].style.replace(/\s+/g, '-')}.png`)

  if (primary) {
    await derivePrimaryAssets({
      projectId: params.projectId,
      primary,
      background: params.branding.colorPalette.background,
      kitFiles,
    })
  }

  await buildBrandKit(params.projectId, kitFiles)

  return { generated: results.length, requested: LOGO_COUNT }
}

async function derivePrimaryAssets(params: {
  projectId: string
  primary: Buffer
  background: string
  kitFiles: Map<string, Buffer>
}) {
  const derived: { name: string; buffer: Buffer; kind: 'favicon' | 'social_avatar'; size?: number }[] =
    []

  for (const size of [512, 256, 128]) {
    derived.push({
      name: `primary-${size}.png`,
      buffer: await resizePng(params.primary, size),
      kind: 'social_avatar',
      size,
    })
  }

  derived.push({
    name: 'favicon-32.png',
    buffer: await resizePng(params.primary, 32),
    kind: 'favicon',
    size: 32,
  })

  derived.push({
    name: 'social-avatar-1080.png',
    buffer: await resizePng(params.primary, 1080),
    kind: 'social_avatar',
    size: 1080,
  })

  derived.push({
    name: 'og-image-1200x630.png',
    buffer: await makeOgImage(params.primary, params.background),
    kind: 'social_avatar',
  })

  derived.push({
    name: 'monochrome.png',
    buffer: await makeMonochrome(params.primary),
    kind: 'social_avatar',
  })

  for (const asset of derived) {
    const key = objectKey(params.projectId, asset.name)
    await uploadObject({ key, body: asset.buffer, contentType: 'image/png' })

    await db.insert(generatedFiles).values({
      projectId: params.projectId,
      kind: asset.kind,
      r2Key: key,
      mimeType: 'image/png',
      sizeBytes: asset.buffer.byteLength,
      width: asset.size ?? null,
      height: asset.size ?? null,
    })

    params.kitFiles.set(asset.name, asset.buffer)
  }
}


/**
 * Rebuilds the derived assets from a chosen logo concept.
 *
 * Called when a customer picks a different concept as their primary. Only
 * image processing runs, so this costs nothing — the point is that the favicon,
 * avatars, OG card and brand kit reflect the logo they actually chose rather
 * than whichever concept was generated first.
 */
export async function rederivePrimaryAssets(projectId: string, primaryKey: string) {
  const url = await signedDownloadUrl(primaryKey, 300)
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Could not read the chosen logo (${response.status})`)

  const primary = Buffer.from(await response.arrayBuffer())

  const [branding] = await db
    .select()
    .from(brandingAssets)
    .where(eq(brandingAssets.projectId, projectId))
    .limit(1)

  const background = branding?.colorPalette?.background ?? '#ffffff'

  // The kit is rebuilt from the concepts already stored, plus the newly
  // derived assets, so nothing has to be regenerated by a model.
  const kitFiles = new Map<string, Buffer>()

  const concepts = await db
    .select()
    .from(generatedFiles)
    .where(eq(generatedFiles.projectId, projectId))

  for (const file of concepts) {
    if (file.kind !== 'logo_raster' && file.kind !== 'logo_svg') continue
    const assetUrl = await signedDownloadUrl(file.r2Key, 300)
    const assetResponse = await fetch(assetUrl)
    if (!assetResponse.ok) continue
    const name = file.r2Key.split('/').pop() ?? file.id
    kitFiles.set(name.replace(/^logo-/, ''), Buffer.from(await assetResponse.arrayBuffer()))
  }

  // Replace rather than duplicate: the derived rows are regenerated each time.
  await db
    .delete(generatedFiles)
    .where(
      and(
        eq(generatedFiles.projectId, projectId),
        inArray(generatedFiles.kind, ['favicon', 'social_avatar', 'brand_kit_zip']),
      ),
    )

  await derivePrimaryAssets({ projectId, primary, background, kitFiles })
  await buildBrandKit(projectId, kitFiles)
}
