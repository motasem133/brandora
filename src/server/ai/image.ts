import 'server-only'

import { env } from '@/lib/env'
import { AppError } from '@/lib/errors'
import { db } from '@/server/db'
import { aiUsage } from '@/server/db/schema'
import type { BrandingOutput } from './schemas'
import type { ProjectBrief } from './prompts'

/**
 * Seedream 5.0 on BytePlus ModelArk.
 *
 * Chosen over the Gemini and GPT image models on OpenRouter for one reason
 * that dominates logo work: text-in-image fidelity. A logo is usually a
 * wordmark, and most image models still mangle letterforms — Arabic script
 * especially, where incorrect letter joining makes output unusable.
 */
export const SEEDREAM_MODEL = 'seedream-5-0-pro'

/** USD per generated image at or below 2.36 megapixels. */
const COST_PER_IMAGE = 0.075

export const LOGO_STYLES = [
  'wordmark',
  'lettermark monogram',
  'abstract geometric icon',
  'emblem badge',
] as const

export type LogoStyle = (typeof LOGO_STYLES)[number]

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
  const palette = branding.colorPalette
  const isArabic = project.language === 'ar'

  return [
    `A professional ${style} logo for "${name}", a ${project.industry} business.`,
    `The text must read exactly: ${name.split('').join(' ')} — spelled "${name}".`,
    `Brand style: ${project.brandStyle}. Brand values: ${branding.brandValues.join(', ')}.`,
    `Use these colours: ${palette.primary} as the primary and ${palette.secondary} as the secondary, on a plain ${palette.background} background.`,
    'Flat vector design, solid fills, no gradients, no shading, no photorealism, no 3D.',
    'Centred with generous margins, plain background, clean silhouette.',
    'No mockup, no business card, no packaging, no hands, no room, no watermark.',
    isArabic
      ? 'Arabic script with correct letter joining and diacritics, Kufic or Naskh influence, typographically accurate.'
      : 'Clean Latin typography, correctly spelled, evenly spaced letterforms.',
  ].join(' ')
}

type SeedreamResponse = {
  data?: { url?: string; b64_json?: string }[]
  error?: { message?: string; code?: string }
}

/** Generates one image and returns its bytes. */
export async function generateLogoImage(params: {
  prompt: string
  organizationId: string
  projectId: string
  generationJobId: string
}): Promise<Buffer> {
  if (!env.BYTEPLUS_API_KEY) {
    throw new AppError('AI_PROVIDER_ERROR', 'BYTEPLUS_API_KEY is not configured.')
  }

  const startedAt = Date.now()

  try {
    const response = await fetch(`${env.BYTEPLUS_BASE_URL}/images/generations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.BYTEPLUS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: SEEDREAM_MODEL,
        prompt: params.prompt,
        size: '1024x1024',
        response_format: 'url',
        watermark: false,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Seedream returned ${response.status}: ${text.slice(0, 300)}`)
    }

    const payload = (await response.json()) as SeedreamResponse
    if (payload.error) throw new Error(payload.error.message ?? 'Seedream returned an error')

    const image = payload.data?.[0]
    if (!image) throw new Error('Seedream returned no image')

    const bytes = image.b64_json
      ? Buffer.from(image.b64_json, 'base64')
      : Buffer.from(await (await fetch(image.url!)).arrayBuffer())

    await recordImageUsage({ ...params, latencyMs: Date.now() - startedAt, status: 'success' })
    return bytes
  } catch (error) {
    await recordImageUsage({ ...params, latencyMs: Date.now() - startedAt, status: 'error' })
    throw error
  }
}

async function recordImageUsage(params: {
  organizationId: string
  projectId: string
  generationJobId: string
  latencyMs: number
  status: 'success' | 'error'
}) {
  try {
    await db.insert(aiUsage).values({
      organizationId: params.organizationId,
      projectId: params.projectId,
      generationJobId: params.generationJobId,
      feature: 'logo',
      provider: 'byteplus',
      model: SEEDREAM_MODEL,
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
