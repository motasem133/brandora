import 'server-only'

import { optimize } from 'svgo'

import { env } from '@/lib/env'
import { AppError } from '@/lib/errors'
import { db } from '@/server/db'
import { aiUsage } from '@/server/db/schema'
import type { ProjectBrief } from './prompts'
import type { BrandingOutput } from './schemas'

/**
 * Seedream 5.0 Pro, served through fal.
 *
 * Seedream is chosen over the Gemini and GPT image models for one reason that
 * dominates logo work: text-in-image fidelity. A logo is usually a wordmark,
 * and most image models still mangle letterforms — Arabic script especially,
 * where incorrect letter joining makes the output unusable.
 *
 * fal rather than BytePlus direct because it is the same ByteDance model at a
 * slightly lower price, without business-verification signup.
 *
 * Note the missing `fal-ai/` prefix below: Seedream v4 and v4.5 are published
 * under `fal-ai/bytedance/...`, but v5 is under `bytedance/...`. Getting this
 * wrong returns a 404 that only surfaces once the account has balance, because
 * fal checks billing before routing.
 */
const DEFAULT_MODEL = 'bytedance/seedream/v5/pro/text-to-image'

/**
 * Output dimensions, requested explicitly.
 *
 * 1536 is the largest size fal still bills at the lower rate — one pixel more
 * and the price per image doubles to $0.135. So this is the whole of the
 * cheaper tier and none of the expensive one: two concepts cost $0.135
 * together, half of what the run cost at 2048 and half of what four at 1024
 * cost before that, while every image is still 50% wider than that original
 * 1024. It also generates faster, which is most of why a run took three
 * minutes.
 *
 * The old reasoning for 1024 was that the raster gets vectorised anyway so its
 * resolution hardly mattered. That was wrong in the place customers actually
 * meet the file — the PNG is what gets downloaded and put on a sign — and it
 * is why this is not simply reverted.
 */
const IMAGE_SIZE = { width: 1536, height: 1536 } as const

/** USD per generated image at or below fal's 1536x1536 threshold. */
const COST_PER_IMAGE = 0.0675

/**
 * Two concepts, chosen to cover the two jobs a brand's artwork has to do.
 *
 * Four styles at once looked generous and mostly produced four variations of
 * the same idea at a resolution too low to use. The wordmark is what goes on a
 * header, a sign, a letterhead; the icon is what survives being shrunk to a
 * favicon, an avatar or an app tile. Every other style is a blend of those two,
 * and the derived assets — favicon, avatars, monochrome — need a text-free
 * mark to cut from, which only the icon reliably gives.
 *
 * The monogram and the emblem badge are not gone from the product: a customer
 * who wants one asks for it in the logo brief, which is appended to the prompt
 * verbatim and outranks everything above it.
 */
export const LOGO_STYLES = ['wordmark', 'abstract geometric icon'] as const

export type LogoStyle = (typeof LOGO_STYLES)[number]

/**
 * The brief, trimmed to something a diffusion prompt can still act on.
 *
 * An image prompt is not a chat prompt: the later clauses stop steering the
 * picture, so a customer's full paragraph cannot simply be pasted in ahead of
 * the spelling and composition rules. Cut at a word boundary, because a
 * sentence ending mid-word reads to the model as noise rather than as a
 * truncation.
 *
 * The limit was 180 until a real run showed what that costs. The onboarding
 * question asks for three things — what you do, who it is for, what makes you
 * different — and the third is the one no competitor shares. At 180 characters
 * it was exactly the one being cut: a roastery's "we print the farm and the
 * harvest date on every bag" fell off the end while "we sell coffee" survived.
 * 320 fits the three-sentence answer the form asks for, and the whole prompt
 * still lands under a thousand characters.
 */
function condense(text: string, limit = 320) {
  const clean = text.trim().replace(/\s+/g, ' ')
  if (!clean) return null
  if (clean.length <= limit) return clean

  const cut = clean.slice(0, limit)
  const boundary = cut.lastIndexOf(' ')

  return `${(boundary > 60 ? cut.slice(0, boundary) : cut).replace(/[.,;:]$/, '')}…`
}

/**
 * Prompt constraints that matter specifically for logos.
 *
 * "flat vector, solid fills, no gradients" is not an aesthetic preference — it
 * is what makes the downstream SVG trace clean. Gradients and photographic
 * noise produce thousands of stray paths.
 */
export function logoPrompt(params: {
  style: LogoStyle
  name: string
  project: ProjectBrief
  branding: BrandingOutput
}) {
  const { style, name, project, branding } = params
  const brief = project.logoBrief?.trim()
  const about = condense(project.brandBrief)
  const palette = branding.colorPalette
  const isArabic = project.language === 'ar'

  return [
    `A professional ${style} logo for "${name}", a ${project.industry} business.`,
    // Spelling it out letter by letter measurably reduces invented lookalike words.
    `The text must read exactly "${name}", spelled ${name.split('').join('-')}.`,
    /*
     * What the business actually is, near the front where it still steers.
     *
     * The mark used to be drawn from industry, style and palette alone, which
     * is the same input every business in a category gives — so every coffee
     * brand got the same four concepts. The customer's own description is the
     * only thing here that distinguishes one from another.
     *
     * Told to inform rather than to illustrate, because "we roast single-origin
     * beans" as a literal instruction produces a drawing of a coffee bean, and
     * a mark is not an illustration of a sentence.
     */
    about ? `The business: ${about} Let this inform the concept, not be drawn literally.` : null,
    `Brand style: ${project.brandStyle}. Brand values: ${branding.brandValues.join(', ')}.`,
    `Use ${palette.primary} as the primary colour and ${palette.secondary} as the secondary, on a plain ${palette.background} background.`,
    'Flat vector design, solid fills, no gradients, no shading, no photorealism, no 3D.',
    'Centred with generous margins, plain background, clean silhouette.',
    'No mockup, no business card, no packaging, no hands, no room, no watermark.',
    isArabic
      ? 'Arabic script with correct letter joining, Kufic or Naskh influence, typographically accurate.'
      : 'Clean Latin typography, correctly spelled, evenly spaced letterforms.',
    // Last, so an explicit instruction outweighs the generic direction above.
    brief ? `Follow this direction from the client closely: ${brief}` : null,
  ]
    .filter(Boolean)
    .join(' ')
}

/**
 * Recraft's vectorizer, which replaced tracing the raster ourselves.
 *
 * VTracer ran locally and turned a diffusion image into geometry the only way
 * a tracer can: by following colour boundaries. Diffusion output has noise, so
 * the noise became geometry too — a real wordmark came back as 1299 paths in
 * 273KB, speckled with stray marks over what should have been a flat
 * background. Nobody can open that in a vector editor and change a colour.
 *
 * Measured against the same artwork, this returns 199 paths in 106KB with the
 * background actually flat, and an icon at 25 paths. It is the same picture the
 * customer chose — which matters, because the SVG has to be the logo they
 * picked and not a second interpretation of the brief.
 *
 * It also removes the last native binary from the deployment.
 */
const VECTORIZE_MODEL = 'fal-ai/recraft/vectorize'

/**
 * One cent per image, read off fal's own billing rather than guessed.
 *
 * This was zero, and deliberately so: fal's balance had not settled six
 * seconds after a test call, so the figure could not be measured, and an
 * invented number in the margin column is worse than an absent one. The usage
 * rows were written the whole time, waiting for exactly this.
 *
 * It runs twice per brand — one call per logo concept — so it is two cents on
 * a run, against about $0.149 of everything else. Small, and it is the last
 * cost in the product that was recording as free, which means every margin
 * figure the admin screens show is now a real number rather than a ceiling.
 */
const COST_PER_VECTORIZE = 0.01

type FalResponse = {
  images?: { url?: string; content_type?: string }[]
  image?: { url?: string }
  detail?: string | { msg?: string }[]
  error?: string
}

/** Generates one logo image and returns its bytes. */
export async function generateLogoImage(params: {
  prompt: string
  organizationId: string
  projectId: string
  generationJobId: string
}): Promise<Buffer> {
  return generateImage({ ...params, feature: 'logo' })
}

/**
 * One photograph for a kit.
 *
 * The same model and the same price tier as a logo — what differs is the
 * prompt and how the result is used, so it is worth its own entry in
 * `ai_usage` rather than being counted as a logo. A kit that cost three
 * "logos" would make the margin figures lie.
 *
 * `kit` rather than `social` for the same reason, since 11 August. Three of
 * these cost about twenty pence; the written captions filed beside them cost a
 * sixth of a penny, and one row cannot describe both.
 */
export async function generateSceneImage(params: {
  prompt: string
  organizationId: string
  projectId: string
  generationJobId: string
}): Promise<Buffer> {
  return generateImage({ ...params, feature: 'kit' })
}

/** Generates one image and returns its bytes. */
async function generateImage(params: {
  prompt: string
  organizationId: string
  projectId: string
  generationJobId: string
  feature: 'logo' | 'kit'
}): Promise<Buffer> {
  if (!env.FAL_KEY) {
    throw new AppError('AI_PROVIDER_ERROR', 'FAL_KEY is not configured.')
  }

  const model = env.FAL_IMAGE_MODEL || DEFAULT_MODEL
  const startedAt = Date.now()
  const usage = { ...params, model, cost: COST_PER_IMAGE }

  try {
    const response = await fetch(`https://fal.run/${model}`, {
      method: 'POST',
      headers: { Authorization: `Key ${env.FAL_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: params.prompt,
        image_size: IMAGE_SIZE,
        num_images: 1,
        output_format: 'png',
        enable_safety_checker: true,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`fal returned ${response.status}: ${text.slice(0, 300)}`)
    }

    const payload = (await response.json()) as FalResponse
    const url = payload.images?.[0]?.url

    if (!url) {
      const detail =
        typeof payload.detail === 'string'
          ? payload.detail
          : (payload.error ?? JSON.stringify(payload).slice(0, 200))
      throw new Error(`fal returned no image: ${detail}`)
    }

    const image = await fetch(url)
    if (!image.ok) throw new Error(`Could not download generated image (${image.status})`)

    const bytes = Buffer.from(await image.arrayBuffer())
    await recordImageUsage({ ...usage, latencyMs: Date.now() - startedAt, status: 'success' })
    return bytes
  } catch (error) {
    await recordImageUsage({ ...usage, latencyMs: Date.now() - startedAt, status: 'error' })
    throw error
  }
}

/**
 * Turns a generated raster into a real SVG.
 *
 * Takes a URL rather than bytes because the PNG is already in R2 by the time
 * this runs — sending a multi-megabyte data URI to say what a signed link
 * already says would be the slower way round.
 *
 * The caller treats failure as recoverable: a logo that will not vectorise is
 * still a usable raster logo, and must not fail the concept it belongs to.
 */
export async function vectorizeToSvg(params: {
  imageUrl: string
  organizationId: string
  projectId: string
  generationJobId: string
}): Promise<string> {
  if (!env.FAL_KEY) {
    throw new AppError('AI_PROVIDER_ERROR', 'FAL_KEY is not configured.')
  }

  const startedAt = Date.now()
  const usage = { ...params, model: VECTORIZE_MODEL, feature: 'vectorize' as const, cost: COST_PER_VECTORIZE }

  try {
    const response = await fetch(`https://fal.run/${VECTORIZE_MODEL}`, {
      method: 'POST',
      headers: { Authorization: `Key ${env.FAL_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: params.imageUrl }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`fal vectorize returned ${response.status}: ${text.slice(0, 300)}`)
    }

    const payload = (await response.json()) as FalResponse
    const url = payload.image?.url ?? payload.images?.[0]?.url
    if (!url) throw new Error(`fal vectorize returned no image: ${JSON.stringify(payload).slice(0, 200)}`)

    const svg = await fetch(url)
    if (!svg.ok) throw new Error(`Could not download the vectorised logo (${svg.status})`)

    const raw = await svg.text()

    /*
     * SVGO earns its place here for one specific reason beyond size: Recraft
     * embeds a C2PA provenance manifest as a base64 blob in <metadata>, which
     * is tens of kilobytes of something no design tool reads. preset-default
     * drops it. removeDimensions then strips the fixed width/height so the
     * logo scales to whatever container it lands in.
     */
    const optimised = optimize(raw, { multipass: true, plugins: ['preset-default', 'removeDimensions'] })

    await recordImageUsage({ ...usage, latencyMs: Date.now() - startedAt, status: 'success' })
    return optimised.data
  } catch (error) {
    await recordImageUsage({ ...usage, latencyMs: Date.now() - startedAt, status: 'error' })
    throw error
  }
}

async function recordImageUsage(params: {
  organizationId: string
  projectId: string
  generationJobId: string
  model: string
  latencyMs: number
  status: 'success' | 'error'
  feature?: 'logo' | 'vectorize' | 'kit'
  cost?: number
}) {
  const price = params.cost ?? COST_PER_IMAGE

  try {
    await db.insert(aiUsage).values({
      organizationId: params.organizationId,
      projectId: params.projectId,
      generationJobId: params.generationJobId,
      feature: params.feature ?? 'logo',
      provider: 'fal',
      model: params.model,
      imagesGenerated: params.status === 'success' ? 1 : 0,
      costUsd: (params.status === 'success' ? price : 0).toFixed(6),
      latencyMs: params.latencyMs,
      status: params.status,
    })
  } catch (error) {
    // Telemetry must never take down a generation that otherwise succeeded.
    console.error('[image] failed to record usage', error)
  }
}
