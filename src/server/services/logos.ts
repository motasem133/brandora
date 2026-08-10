import 'server-only'

import { and, eq, inArray } from 'drizzle-orm'

import { generateLogoImage, LOGO_STYLES, logoPrompt, vectorizeToSvg, type LogoStyle } from '@/server/ai/image'
import type { ProjectBrief } from '@/server/ai/prompts'
import type { BrandingOutput } from '@/server/ai/schemas'
import { db } from '@/server/db'
import { brandingAssets, generatedFiles } from '@/server/db/schema'
import { objectKey, signedDownloadUrl, uploadObject } from '@/server/storage/r2'
import { noteLogoConcept } from './generation'
import { buildBrandKit } from './brand-kit'
import {
  backdropFill,
  cropSvg,
  liftBackground,
  openCounters,
  splitLockup,
  stripSvgBackground,
} from './logo-parts'
import { makeMonochrome, makeOgImage, measure, resizePng } from './vectorize'

/**
 * Concepts per round — every style in the list, not a slice of it.
 *
 * This was 4 against a list of 4, so the two numbers agreeing was a
 * coincidence rather than a fact. Deriving it means the count cannot drift
 * from the styles actually generated, which is what `requested` is reported
 * against when credits are settled.
 */
export const LOGO_COUNT = LOGO_STYLES.length

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
    LOGO_STYLES.map(async (style) => {
      const prompt = logoPrompt({ style, name, project: params.project, branding: params.branding })

      const raster = await generateLogoImage({
        prompt,
        organizationId: params.organizationId,
        projectId: params.projectId,
        generationJobId: params.generationJobId,
      })

      const slug = style.replace(/\s+/g, '-')

      /*
       * Measuring is best-effort, like vectorising below it.
       *
       * This read the image's dimensions through `sharp` — a native binary —
       * and it was the only thing standing between a generated logo and being
       * saved. On the first production run every one of four concepts failed
       * here, after the images had already been generated and paid for, and
       * nothing reached storage. The columns it fills are nullable; an
       * unmeasured logo is still a logo.
       *
       * The import stays deferred: a static one runs the loader whenever
       * anything in this module graph is imported, which is what killed
       * `/api/inngest` on startup.
       */
      const meta = await measure(raster)

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

      /*
       * Announced here, not at the end of the step.
       *
       * The picture exists and is in storage as of the line above; everything
       * below — vectorising, and then the favicon and avatars derived from a
       * chosen concept — is work the customer does not have to wait through to
       * see what was drawn. Before this, the page learned about the logos when
       * the whole step finished, which was tens of seconds after the first one
       * was ready to look at.
       */
      await noteLogoConcept(params.generationJobId)

      // Vectorisation is best-effort: a logo that will not vectorise cleanly is
      // still a usable raster logo, so it must not fail the whole concept.
      try {
        /*
         * A signed link rather than the bytes. The PNG went to R2 a few lines
         * above, so the object already exists; posting a two-megabyte data URI
         * to describe a file the vectoriser can simply fetch would be the
         * slower way round. The URL is short-lived by default.
         */
        const svg = await vectorizeToSvg({
          imageUrl: await signedDownloadUrl(pngKey),
          organizationId: params.organizationId,
          projectId: params.projectId,
          generationJobId: params.generationJobId,
        })
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

  const failures: string[] = []
  for (const outcome of settled) {
    if (outcome.status === 'fulfilled') results.push(outcome.value)
    else {
      const reason =
        outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason)
      failures.push(reason)
      console.warn('[logos] concept failed', outcome.reason)
    }
  }

  if (results.length === 0) {
    /*
     * The reason travels with the failure.
     *
     * "Every logo concept failed to generate." was the whole of what a run
     * recorded, while the actual cause went to a console nobody reads — so a
     * production failure that had already spent the customer's credits and
     * eight image generations could not be diagnosed from the job at all.
     * Distinct reasons only: four copies of one message is not four facts.
     */
    const distinct = [...new Set(failures)]
    throw new Error(
      distinct.length
        ? `Every logo concept failed to generate. ${distinct.join(' | ')}`
        : 'Every logo concept failed to generate.',
    )
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

  /*
   * Everything below is derived from work that is already saved and already
   * paid for, and none of it may be allowed to fail this step.
   *
   * The favicon, the avatars, the OG card and the brand-kit ZIP are all
   * resized through a native binary. When that binary failed on Vercel, this
   * threw *after* four images had been generated and stored — and because
   * Inngest retries a failed step, the retry re-ran the whole thing from the
   * top and paid fal for four more images, again, on a loop. The job never
   * reached a terminal state, so the customer watched a spinner over logos that
   * were sitting in storage the whole time.
   *
   * Derived assets are extras built from the deliverable. The deliverable is
   * the concepts, and they are done by this point.
   */
  try {
    if (chosen) {
      // Rebuilds the derived assets and the kit from the existing choice, which
      // costs nothing — no model is called.
      await rederivePrimaryAssets(params.projectId, chosen.r2Key)
      return { generated: results.length, requested: LOGO_COUNT }
    }

    // Nothing chosen yet: the newest round's first concept is the wordmark,
    // which is the one that works as an avatar and a favicon.
    const slug = results[0].style.replace(/\s+/g, '-')
    const primary = kitFiles.get(`${slug}.png`)

    if (primary) {
      await derivePrimaryAssets({
        projectId: params.projectId,
        primary,
        primarySvg: kitFiles.get(`${slug}.svg`)?.toString('utf8'),
        background: params.branding.colorPalette.background,
        kitFiles,
      })
    }

    await buildBrandKit(params.projectId, kitFiles)
  } catch (error) {
    console.warn('[logos] derived assets failed; the concepts are saved', error)
  }

  return { generated: results.length, requested: LOGO_COUNT }
}

/**
 * Every variant derived from the chosen artwork.
 *
 * `icon` is whatever belongs where there is no room for text — the mark if one
 * was chosen, the logo otherwise. `logo` is always the full lockup, because a
 * social card cropped to an icon says nothing about who posted it.
 */
async function derivePrimaryAssets(params: {
  projectId: string
  primary: Buffer
  primarySvg?: string
  icon?: Buffer
  background: string
  kitFiles: Map<string, Buffer>
}) {
  const icon = params.icon ?? params.primary

  await addPlaceableVariants(params)

  const derived: {
    name: string
    buffer: Buffer
    kind: 'favicon' | 'social_avatar'
    size?: number
    variant: string
    source: 'logo' | 'icon'
  }[] = []

  for (const size of [512, 256, 128]) {
    derived.push({
      name: `primary-${size}.png`,
      buffer: await resizePng(icon, size),
      kind: 'social_avatar',
      size,
      variant: 'avatar',
      source: 'icon',
    })
  }

  derived.push({
    name: 'favicon-32.png',
    buffer: await resizePng(icon, 32),
    kind: 'favicon',
    size: 32,
    variant: 'favicon',
    source: 'icon',
  })

  derived.push({
    name: 'social-avatar-1080.png',
    buffer: await resizePng(icon, 1080),
    kind: 'social_avatar',
    size: 1080,
    variant: 'avatar',
    source: 'icon',
  })

  derived.push({
    name: 'og-image-1200x630.png',
    buffer: await makeOgImage(params.primary, params.background),
    kind: 'social_avatar',
    variant: 'og',
    source: 'logo',
  })

  derived.push({
    name: 'monochrome.png',
    buffer: await makeMonochrome(params.primary),
    kind: 'social_avatar',
    variant: 'monochrome',
    source: 'logo',
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
      // Labels the variant for the UI, so it can be listed as "Favicon 32px"
      // rather than by guessing from a filename.
      metadata: { variant: asset.variant, source: asset.source },
    })

    params.kitFiles.set(asset.name, asset.buffer)
  }
}


/**
 * The versions of the logo that can actually be placed on something.
 *
 * Everything else in the kit carries the backdrop the model painted behind it,
 * which means the logo can only ever sit on that one colour — put it on a dark
 * header, a photograph or a printed page and it arrives in a cream box. These
 * are the same artwork with the backdrop lifted, plus the name and the symbol
 * separated when the concept is a lockup of the two.
 *
 * Best-effort by construction. It runs inside the block that already treats
 * derived assets as extras built from work that is finished and paid for, and
 * every file here is an addition — the originals stay exactly where they were,
 * so a customer who wants the backdrop still has it.
 */
async function addPlaceableVariants(params: {
  primary: Buffer
  primarySvg?: string
  kitFiles: Map<string, Buffer>
}) {
  try {
    const transparent = await liftBackground(params.primary)
    params.kitFiles.set('logo-transparent.png', transparent)

    if (params.primarySvg) {
      params.kitFiles.set('logo-transparent.svg', Buffer.from(stripSvgBackground(params.primarySvg)))
    }

    /*
     * Only when there is something to separate. A monogram or an integrated
     * mark is one shape, and cutting it in half would produce two files that
     * are each half a logo — so it returns nothing and the kit simply does not
     * carry these two, which is what "if there is an icon with the text" means.
     */
    const parts = await splitLockup(transparent)
    if (!parts) return

    params.kitFiles.set('text-only.png', parts.text.buffer)
    params.kitFiles.set('icon-only.png', parts.icon.buffer)

    if (params.primarySvg) {
      const bare = stripSvgBackground(params.primarySvg)
      const backdrop = backdropFill(params.primarySvg)

      // Counters are opened in the name only. See `openCounters` for why the
      // same rule would hollow out the symbol.
      const name = backdrop ? openCounters(bare, backdrop) : bare

      params.kitFiles.set('text-only.svg', Buffer.from(cropSvg(name, parts.text.region)))
      params.kitFiles.set('icon-only.svg', Buffer.from(cropSvg(bare, parts.icon.region)))
    }
  } catch (error) {
    // One unusable variant must not cost the customer the favicon, the avatars
    // and the kit that are built after it.
    console.warn('[logos] placeable variants failed; the rest of the kit is unaffected', error)
  }
}

async function readObject(key: string): Promise<Buffer> {
  const url = await signedDownloadUrl(key)
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Could not read the chosen logo (${response.status})`)
  return Buffer.from(await response.arrayBuffer())
}

/**
 * Rebuilds every derived variant from the current choices.
 *
 * Called whenever a customer picks a different logo or icon. Only image
 * processing runs, so this costs nothing — the point is that the favicon,
 * avatars, OG card and brand kit reflect what they actually chose rather than
 * whichever concept happened to be generated first.
 */
export async function rederivePrimaryAssets(projectId: string, primaryKey?: string) {
  const [branding] = await db
    .select()
    .from(brandingAssets)
    .where(eq(brandingAssets.projectId, projectId))
    .limit(1)

  /*
   * The stored choices are the source of truth. An explicit key is only passed
   * by the generation pipeline, which knows the chosen row is still current
   * before the transaction that would tell it otherwise.
   */
  const logoKey = primaryKey ?? (await keyOfFile(branding?.primaryLogoFileId))
  if (!logoKey) throw new Error('No logo has been chosen for this project.')

  const iconKey = await keyOfFile(branding?.markLogoFileId)

  const primary = await readObject(logoKey)
  const icon = iconKey && iconKey !== logoKey ? await readObject(iconKey) : undefined

  const background = branding?.colorPalette?.background ?? '#ffffff'

  // The kit is rebuilt from the concepts already stored, plus the newly
  // derived assets, so nothing has to be regenerated by a model.
  const kitFiles = new Map<string, Buffer>()

  const concepts = await db
    .select()
    .from(generatedFiles)
    .where(eq(generatedFiles.projectId, projectId))

  // The vector of the chosen concept specifically, matched on the raster it
  // was made from — a later round's wordmark must not resolve to an earlier
  // round's trace, which is the same rule the variations panel follows.
  let primarySvg: string | undefined

  for (const file of concepts) {
    if (file.kind !== 'logo_raster' && file.kind !== 'logo_svg') continue
    const assetUrl = await signedDownloadUrl(file.r2Key)
    const assetResponse = await fetch(assetUrl)
    if (!assetResponse.ok) continue
    const name = file.r2Key.split('/').pop() ?? file.id
    const bytes = Buffer.from(await assetResponse.arrayBuffer())

    if (file.kind === 'logo_svg' && file.metadata?.tracedFrom === logoKey) {
      primarySvg = bytes.toString('utf8')
    }

    kitFiles.set(name.replace(/^logo-/, ''), bytes)
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

  await derivePrimaryAssets({ projectId, primary, primarySvg, icon, background, kitFiles })
  await buildBrandKit(projectId, kitFiles)
}

/** Resolves a stored file id to its object key, tolerating a stale reference. */
async function keyOfFile(fileId?: string | null) {
  if (!fileId) return null

  const [file] = await db
    .select({ r2Key: generatedFiles.r2Key })
    .from(generatedFiles)
    .where(eq(generatedFiles.id, fileId))
    .limit(1)

  return file?.r2Key ?? null
}
