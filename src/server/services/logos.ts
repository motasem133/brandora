import 'server-only'

import { eq } from 'drizzle-orm'
import sharp from 'sharp'

import { generateLogoImage, LOGO_STYLES, logoPrompt, type LogoStyle } from '@/server/ai/image'
import type { ProjectBrief } from '@/server/ai/prompts'
import type { BrandingOutput } from '@/server/ai/schemas'
import { db } from '@/server/db'
import { brandingAssets, generatedFiles } from '@/server/db/schema'
import { objectKey, uploadObject } from '@/server/storage/r2'
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

      const pngKey = objectKey(params.projectId, `logo-${slug}.png`)
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
          metadata: { style, prompt },
        })
        .returning()

      kitFiles.set(`${slug}.png`, raster)

      // Vectorisation is best-effort: a logo that will not trace cleanly is
      // still a usable raster logo, so it must not fail the whole concept.
      try {
        const svg = await rasterToSvg(raster)
        const svgKey = objectKey(params.projectId, `logo-${slug}.svg`)
        await uploadObject({ key: svgKey, body: svg, contentType: 'image/svg+xml' })

        await db.insert(generatedFiles).values({
          projectId: params.projectId,
          kind: 'logo_svg',
          r2Key: svgKey,
          mimeType: 'image/svg+xml',
          sizeBytes: Buffer.byteLength(svg),
          metadata: { style, tracedFrom: pngKey },
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

  // Supporting assets are derived from the first successful concept, which is
  // the wordmark — the one that works as an avatar and a favicon.
  const primary = kitFiles.get(`${results[0].style.replace(/\s+/g, '-')}.png`)

  if (primary) {
    await derivePrimaryAssets({
      projectId: params.projectId,
      primary,
      background: params.branding.colorPalette.background,
      kitFiles,
    })
  }

  await db
    .update(brandingAssets)
    .set({
      logoConcepts: results.map((r) => ({ fileId: r.fileId, prompt: r.prompt, style: r.style })),
      updatedAt: new Date(),
    })
    .where(eq(brandingAssets.projectId, params.projectId))

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
