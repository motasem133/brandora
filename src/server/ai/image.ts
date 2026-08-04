import 'server-only'

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
 * The named `square_hd` preset resolves to 2048x2048 on Seedream v5, which
 * crosses fal's 1536x1536 threshold and doubles the price to $0.135. 1024 is
 * ample for a logo that gets vectorised immediately afterwards.
 */
const IMAGE_SIZE = { width: 1024, height: 1024 } as const

/** USD per generated image at or below 1536x1536. */
const COST_PER_IMAGE = 0.0675

export const LOGO_STYLES = [
  'wordmark',
  'lettermark monogram',
  'abstract geometric icon',
  'emblem badge',
] as const

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

type FalResponse = {
  images?: { url?: string; content_type?: string }[]
  detail?: string | { msg?: string }[]
  error?: string
}

/** Generates one image and returns its bytes. */
export async function generateLogoImage(params: {
  prompt: string
  organizationId: string
  projectId: string
  generationJobId: string
}): Promise<Buffer> {
  if (!env.FAL_KEY) {
    throw new AppError('AI_PROVIDER_ERROR', 'FAL_KEY is not configured.')
  }

  const model = env.FAL_IMAGE_MODEL || DEFAULT_MODEL
  const startedAt = Date.now()

  try {
    const response = await fetch(`https://fal.run/${model}`, {
      method: 'POST',
      headers: {
        Authorization: `Key ${env.FAL_KEY}`,
        'Content-Type': 'application/json',
      },
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

    await recordImageUsage({ ...params, model, latencyMs: Date.now() - startedAt, status: 'success' })
    return bytes
  } catch (error) {
    await recordImageUsage({ ...params, model, latencyMs: Date.now() - startedAt, status: 'error' })
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
}) {
  try {
    await db.insert(aiUsage).values({
      organizationId: params.organizationId,
      projectId: params.projectId,
      generationJobId: params.generationJobId,
      feature: 'logo',
      provider: 'fal',
      model: params.model,
      imagesGenerated: params.status === 'success' ? 1 : 0,
      costUsd: (params.status === 'success' ? COST_PER_IMAGE : 0).toFixed(6),
      latencyMs: params.latencyMs,
      status: params.status,
    })
  } catch (error) {
    // Telemetry must never take down a generation that otherwise succeeded.
    console.error('[image] failed to record usage', error)
  }
}
