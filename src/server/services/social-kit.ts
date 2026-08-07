import 'server-only'

import { and, eq } from 'drizzle-orm'

import { generateSceneImage } from '@/server/ai/image'
import { db } from '@/server/db'
import { brandingAssets, generatedFiles, projects, socialMediaAssets } from '@/server/db/schema'
import { buildCopy } from '@/server/render/copy'
import { renderToPng } from '@/server/render/browser'
import { renderKitPdf } from '@/server/render/kit-pdf'
import { LAYOUTS, renderLayout, type LayoutKind } from '@/server/render/layouts'
import { fontFace, type PostBrand } from '@/server/render/post-template'
import { scenePrompt, SCENES, type SceneKind } from '@/server/render/scenery'
import { liftBackground, splitLockup, trim } from '@/server/services/logo-parts'
import { shrinkPng, toJpeg } from '@/server/services/vectorize'
import { objectKey, signedDownloadUrl, uploadObject } from '@/server/storage/r2'

/**
 * The social kit: photography, finished posts, and the identity as one file.
 *
 * Three functions rather than one, because each is a separate Inngest step and
 * steps are the unit Inngest memoises. The photographs are the only part that
 * costs money and by far the slowest — roughly two and a half minutes each —
 * so if the PDF fails, the retry must not buy them again. That is not a
 * hypothetical: the logo step once retried four paid images on a loop because
 * a cheap thing after them threw.
 *
 * Everything else is derived from work already done and already paid for.
 */

const SCENE_KINDS = Object.keys(SCENES) as SceneKind[]

/** Keys of the scene images in storage, by scene. Serialisable across steps. */
export type SceneKeys = Partial<Record<SceneKind, string>>

async function loadFont(family: string): Promise<Buffer | null> {
  try {
    const css = await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 6.1)' },
    })
    const url = (await css.text()).match(/https:\/\/[^)]+/)?.[0]
    if (!url) return null
    return Buffer.from(await (await fetch(url)).arrayBuffer())
  } catch (error) {
    // A missing face is a worse-looking kit, not a failed one.
    console.warn(`[kit] could not load "${family}"`, error)
    return null
  }
}

async function readObject(key: string) {
  const response = await fetch(await signedDownloadUrl(key))
  if (!response.ok) throw new Error(`Could not read ${key} (${response.status})`)
  return Buffer.from(await response.arrayBuffer())
}

const pngUri = (buffer: Buffer) => `data:image/png;base64,${buffer.toString('base64')}`

/**
 * Photographs and finished posts are embedded as JPEG.
 *
 * The first deck came to 13MB because everything went in as PNG — a lossless
 * format storing photographs. The same images come to 2.2MB this way, an 87%
 * saving measured on the real files, and the deck is meant to be sent to
 * someone. Logos stay PNG: JPEG has no alpha, so a transparent mark would
 * arrive on a black square.
 */
const jpegUri = async (buffer: Buffer, quality = 82, fit = 1080) =>
  `data:image/jpeg;base64,${(await toJpeg(buffer, quality, fit)).toString('base64')}`

/** Everything the renderer needs about a brand, loaded once per step. */
async function loadBrand(projectId: string) {
  const [row] = await db
    .select({
      title: projects.title,
      businessName: projects.businessName,
      industry: projects.industry,
      style: projects.brandStyle,
      brief: projects.brandBrief,
      palette: brandingAssets.colorPalette,
      fonts: brandingAssets.fontRecommendations,
      slogan: brandingAssets.slogan,
      story: brandingAssets.brandStory,
      values: brandingAssets.brandValues,
      voice: brandingAssets.brandVoice,
      primaryLogoFileId: brandingAssets.primaryLogoFileId,
    })
    .from(projects)
    .innerJoin(brandingAssets, eq(brandingAssets.projectId, projects.id))
    .where(eq(projects.id, projectId))
    .limit(1)

  if (!row) throw new Error('This project has no branding to build a kit from.')
  if (!row.palette) throw new Error('This project has no colour palette yet.')

  const brand: PostBrand = {
    name: row.businessName || row.title,
    slogan: row.slogan,
    industry: row.industry,
    style: row.style,
    palette: row.palette,
    fonts: { heading: row.fonts?.heading ?? 'Inter', body: row.fonts?.body ?? 'Inter' },
  }

  return { row, brand }
}

/**
 * The chosen logo, split into the name and the symbol the layouts want.
 *
 * `fit` caps how many pixels of transparency travel with them. A post shows
 * the wordmark at 190px and the PDF at most at 190; carrying a 735-wide one is
 * data nobody sees, and in a PDF it is a soft mask the reader recomposites on
 * every repaint.
 */
async function loadMarks(primaryLogoFileId: string | null, fit?: number) {
  if (!primaryLogoFileId) throw new Error('No logo has been chosen for this project.')

  const [logo] = await db
    .select({ r2Key: generatedFiles.r2Key })
    .from(generatedFiles)
    .where(eq(generatedFiles.id, primaryLogoFileId))
    .limit(1)

  if (!logo) throw new Error('The chosen logo is missing from storage.')

  const transparent = await liftBackground(await readObject(logo.r2Key))
  const parts = await splitLockup(transparent)
  const trimmed = parts ? null : await trim(transparent)

  const wordmark = parts ? parts.text.buffer : trimmed!
  const mark = parts ? parts.icon.buffer : trimmed!
  const cap = async (buffer: Buffer) => (fit ? shrinkPng(buffer, fit) : buffer)

  return {
    logo: pngUri(await cap(transparent)),
    wordmark: pngUri(await cap(wordmark)),
    mark: pngUri(await cap(mark)),
  }
}

async function loadFaces(brand: PostBrand) {
  const families = [...new Set([brand.fonts.heading, brand.fonts.body])]
  const loaded = await Promise.all(families.map(async (f) => [f, await loadFont(f)] as const))
  return loaded
    .filter((entry): entry is [string, Buffer] => entry[1] !== null)
    .map(([family, file]) => fontFace(family, file))
    .join('\n')
}

/* -------------------------------------------------------------------------- */
/*                          Step one — the photographs                        */
/* -------------------------------------------------------------------------- */

/**
 * Generates and stores the scenes a kit is built on.
 *
 * The only paid part of a kit, and the only part that must never run twice for
 * one job. Each scene is saved the instant it exists rather than at the end, so
 * a partial failure keeps whatever was already bought.
 */
export async function generateKitScenes(params: {
  projectId: string
  organizationId: string
  generationJobId: string
  /** Buy new photography even though this project already has some. */
  fresh?: boolean
}): Promise<SceneKeys> {
  const { row } = await loadBrand(params.projectId)

  /*
   * Photography a project already owns is reused.
   *
   * It is the only part of a kit that costs money, and most reasons to build
   * a kit again are not reasons to reshoot: a different logo was chosen, the
   * copy changed, a layout was fixed. Charging for three fresh photographs
   * every time would make "build it again" an expensive way to re-render.
   */
  if (!params.fresh) {
    const existing = await db
      .select({ r2Key: generatedFiles.r2Key, metadata: generatedFiles.metadata })
      .from(generatedFiles)
      .where(
        and(eq(generatedFiles.projectId, params.projectId), eq(generatedFiles.kind, 'social_scene')),
      )

    const reused: SceneKeys = {}
    for (const file of existing) {
      const scene = file.metadata?.scene as SceneKind | undefined
      if (scene && SCENE_KINDS.includes(scene)) reused[scene] = file.r2Key
    }

    if (Object.keys(reused).length === SCENE_KINDS.length) return reused
  }

  // A rerun replaces its scenes rather than accumulating them.
  await db
    .delete(generatedFiles)
    .where(
      and(eq(generatedFiles.projectId, params.projectId), eq(generatedFiles.kind, 'social_scene')),
    )

  const settled = await Promise.allSettled(
    SCENE_KINDS.map(async (kind) => {
      const image = await generateSceneImage({
        prompt: scenePrompt({
          kind,
          project: { industry: row.industry, brandBrief: row.brief, brandStyle: row.style },
          values: row.values ?? [],
          palette: row.palette!,
        }),
        organizationId: params.organizationId,
        projectId: params.projectId,
        generationJobId: params.generationJobId,
      })

      const key = objectKey(params.projectId, `scene-${kind}.png`)
      await uploadObject({ key, body: image, contentType: 'image/png' })
      await db.insert(generatedFiles).values({
        projectId: params.projectId,
        kind: 'social_scene',
        r2Key: key,
        mimeType: 'image/png',
        sizeBytes: image.byteLength,
        metadata: { scene: kind },
      })

      return [kind, key] as const
    }),
  )

  const keys: SceneKeys = {}
  const failures: string[] = []

  for (const outcome of settled) {
    if (outcome.status === 'fulfilled') {
      keys[outcome.value[0]] = outcome.value[1]
    } else {
      failures.push(
        outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason),
      )
      console.warn('[kit] a scene failed; the kit continues without it', outcome.reason)
    }
  }

  /*
   * The reason travels with the failure.
   *
   * "No photography could be generated." was the whole of what the first
   * production run recorded, while the actual cause — fal answering 403 "User
   * is locked. Reason: Exhausted balance." in 120ms — went to a console nobody
   * reads. Diagnosing it meant going and asking fal directly, which is not
   * something a customer or a support reply can do. Distinct reasons only:
   * three copies of one message is not three facts.
   */
  if (Object.keys(keys).length === 0) {
    const distinct = [...new Set(failures)]
    throw new Error(
      distinct.length
        ? `No photography could be generated. ${distinct.join(' | ').slice(0, 400)}`
        : 'No photography could be generated.',
    )
  }

  return keys
}

/* -------------------------------------------------------------------------- */
/*                            Step two — the posts                            */
/* -------------------------------------------------------------------------- */

export async function renderKitPosts(params: {
  projectId: string
  scenes: SceneKeys
  /** A slice of the layouts, so one step cannot outrun the function's ceiling. */
  only?: LayoutKind[]
  /** Only the first slice clears what a previous run left behind. */
  replace?: boolean
}) {
  const { row, brand } = await loadBrand(params.projectId)
  const marks = await loadMarks(row.primaryLogoFileId)
  const faces = await loadFaces(brand)

  const [social] = await db
    .select({ posts: socialMediaAssets.instagramPosts })
    .from(socialMediaAssets)
    .where(eq(socialMediaAssets.projectId, params.projectId))
    .limit(1)

  const kinds = Object.keys(LAYOUTS) as LayoutKind[]
  const wanted = params.only ?? kinds
  const copy = buildCopy(
    {
      posts: social?.posts ?? [],
      story: row.story,
      values: row.values ?? [],
      voice: row.voice,
      slogan: row.slogan,
      name: brand.name,
    },
    kinds,
  )

  // Replaced, not appended: a rerun means "these instead". Only the first
  // slice clears, or the second would delete what the first just made.
  if (params.replace !== false) {
    await db
      .delete(generatedFiles)
      .where(
        and(eq(generatedFiles.projectId, params.projectId), eq(generatedFiles.kind, 'social_post')),
      )
  }

  const sceneUris: Partial<Record<SceneKind, string>> = {}
  for (const kind of SCENE_KINDS) {
    const key = params.scenes[kind]
    if (key) sceneUris[kind] = await jpegUri(await readObject(key))
  }

  const made: LayoutKind[] = []

  for (const layout of wanted) {
    const meta = LAYOUTS[layout]
    // A layout whose photograph never arrived is skipped rather than drawn
    // over an empty frame.
    if (meta.needs && !sceneUris[meta.needs]) continue

    const png = await renderToPng(
      renderLayout(layout, {
        brand,
        faces,
        copy: copy[layout],
        wordmark: marks.wordmark,
        mark: marks.mark,
        photo: meta.needs ? sceneUris[meta.needs]! : null,
        width: meta.size.width,
        height: meta.size.height,
      }),
      meta.size,
    )

    const key = objectKey(params.projectId, `post-${layout}.png`)
    await uploadObject({ key, body: png, contentType: 'image/png' })
    await db.insert(generatedFiles).values({
      projectId: params.projectId,
      kind: 'social_post',
      r2Key: key,
      mimeType: 'image/png',
      sizeBytes: png.byteLength,
      width: meta.size.width,
      height: meta.size.height,
      metadata: { layout, label: meta.label, line: copy[layout]?.lead ?? null },
    })

    made.push(layout)
  }

  /*
   * Only an error when something was actually asked for and none of it could
   * be drawn. A single-layout step whose photograph never arrived returns
   * empty on purpose — the kit is short one post, not broken.
   */
  if (made.length === 0 && wanted.some((layout) => !LAYOUTS[layout].needs)) {
    throw new Error('No posts could be rendered for this kit.')
  }

  return { layouts: made }
}

/* -------------------------------------------------------------------------- */
/*                             Step three — the file                          */
/* -------------------------------------------------------------------------- */

export async function printKitPdf(params: { projectId: string; scenes: SceneKeys }) {
  const { row, brand } = await loadBrand(params.projectId)
  // 380 is comfortably above the largest size any page shows a mark at.
  const marks = await loadMarks(row.primaryLogoFileId, 380)
  const faces = await loadFaces(brand)

  const posts = await db
    .select({ r2Key: generatedFiles.r2Key, metadata: generatedFiles.metadata })
    .from(generatedFiles)
    .where(
      and(eq(generatedFiles.projectId, params.projectId), eq(generatedFiles.kind, 'social_post')),
    )

  /*
   * Everything in the deck is embedded at the size the deck shows it.
   *
   * The PDF page holds every image at once — three scenes, six posts and the
   * marks — and it was the one page heavy enough to kill the browser while
   * seven individual posts drew without trouble. A post thumbnail sits about
   * 430px wide in a row of three; going in at 1080 was six times the pixels
   * for the same picture, paid for in the one place there was no memory left.
   */
  const scenes: { hero?: string; detail?: string } = {}
  for (const kind of ['hero', 'detail'] as const) {
    const key = params.scenes[kind]
    if (key) scenes[kind] = await jpegUri(await readObject(key), 82, 900)
  }

  const pdf = await renderKitPdf(
    { brand, story: row.story, values: row.values ?? [], faces },
    {
      logo: marks.logo,
      wordmark: marks.wordmark,
      mark: marks.mark,
      scenes,
      posts: await Promise.all(
        posts
          // The vertical story would letterbox badly in a 16:9 row of squares.
          .filter((post) => post.metadata?.layout !== 'story')
          .map(async (post) => ({
            label: String(post.metadata?.label ?? 'Post'),
            src: await jpegUri(await readObject(post.r2Key), 86, 560),
          })),
      ),
    },
  )

  await db
    .delete(generatedFiles)
    .where(
      and(eq(generatedFiles.projectId, params.projectId), eq(generatedFiles.kind, 'brand_kit_pdf')),
    )

  const key = objectKey(params.projectId, 'brand-kit.pdf')
  await uploadObject({ key, body: pdf, contentType: 'application/pdf' })
  await db.insert(generatedFiles).values({
    projectId: params.projectId,
    kind: 'brand_kit_pdf',
    r2Key: key,
    mimeType: 'application/pdf',
    sizeBytes: pdf.byteLength,
    metadata: { posts: posts.length },
  })

  return { bytes: pdf.byteLength }
}
