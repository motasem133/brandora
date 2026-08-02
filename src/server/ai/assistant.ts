import 'server-only'

import { tool } from 'ai'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/server/db'
import { brandingAssets, socialMediaAssets, type BrandingAsset, type SocialMediaAsset } from '@/server/db/schema'

/**
 * Brand Assistant tools.
 *
 * The assistant edits assets through these validated functions rather than by
 * emitting free text, so a chat reply can never write a malformed palette or a
 * caption longer than the UI can render. Each input schema is the same shape
 * the generation pipeline enforces, which means anything the assistant can
 * produce, the generator could have produced too.
 *
 * Only free edits live here. Anything that spends credits — regenerating logo
 * images in particular — stays behind the explicit Generate action, because a
 * chat message should never quietly cost money.
 */

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a 6-digit hex colour')

export type AssistantContext = {
  projectId: string
  organizationId: string
}

/** Records what changed so the UI can show it and the thread stays auditable. */
type ToolResult = { ok: true; summary: string } | { ok: false; reason: string }

async function patchBranding(
  projectId: string,
  patch: Partial<typeof brandingAssets.$inferInsert>,
): Promise<boolean> {
  const [updated] = await db
    .update(brandingAssets)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(brandingAssets.projectId, projectId))
    .returning({ id: brandingAssets.id })

  return Boolean(updated)
}

export function buildAssistantTools(context: AssistantContext) {
  const { projectId } = context

  return {
    updatePalette: tool({
      description:
        'Replace the brand colour palette. Use when the user asks for different, warmer, cooler, darker or more accessible colours.',
      inputSchema: z.object({
        primary: hex,
        secondary: hex,
        accent: hex,
        background: hex,
        text: hex.describe('Must meet WCAG AA contrast against background'),
        rationale: z.string().max(200).describe('One short sentence on why these colours'),
      }),
      execute: async ({ rationale, ...palette }): Promise<ToolResult> => {
        const ok = await patchBranding(projectId, { colorPalette: palette })
        return ok
          ? { ok: true, summary: `Palette updated — ${rationale}` }
          : { ok: false, reason: 'This project has no branding yet.' }
      },
    }),

    updateSlogan: tool({
      description: 'Replace the brand slogan or tagline.',
      inputSchema: z.object({ slogan: z.string().min(3).max(80) }),
      execute: async ({ slogan }): Promise<ToolResult> => {
        const ok = await patchBranding(projectId, { slogan })
        return ok
          ? { ok: true, summary: `Slogan updated to "${slogan}"` }
          : { ok: false, reason: 'This project has no branding yet.' }
      },
    }),

    updateStory: tool({
      description: 'Rewrite the brand story. Two or three short paragraphs.',
      inputSchema: z.object({ brandStory: z.string().min(150).max(1500) }),
      execute: async ({ brandStory }): Promise<ToolResult> => {
        const ok = await patchBranding(projectId, { brandStory })
        return ok
          ? { ok: true, summary: 'Brand story rewritten' }
          : { ok: false, reason: 'This project has no branding yet.' }
      },
    }),

    updateVoice: tool({
      description: 'Rewrite the description of the brand voice and tone.',
      inputSchema: z.object({ brandVoice: z.string().min(20).max(400) }),
      execute: async ({ brandVoice }): Promise<ToolResult> => {
        const ok = await patchBranding(projectId, { brandVoice })
        return ok
          ? { ok: true, summary: 'Brand voice updated' }
          : { ok: false, reason: 'This project has no branding yet.' }
      },
    }),

    updateValues: tool({
      description: 'Replace the list of brand values.',
      inputSchema: z.object({
        brandValues: z.array(z.string().min(2).max(40)).min(3).max(5),
      }),
      execute: async ({ brandValues }): Promise<ToolResult> => {
        const ok = await patchBranding(projectId, { brandValues })
        return ok
          ? { ok: true, summary: `Values set to: ${brandValues.join(', ')}` }
          : { ok: false, reason: 'This project has no branding yet.' }
      },
    }),

    updateFonts: tool({
      description:
        'Change the recommended typography. Families must exist on Google Fonts, with Arabic coverage for Arabic brands.',
      inputSchema: z.object({
        heading: z.string().min(2).max(60),
        body: z.string().min(2).max(60),
        accent: z.string().max(60).optional(),
      }),
      execute: async (fonts): Promise<ToolResult> => {
        const ok = await patchBranding(projectId, { fontRecommendations: fonts })
        return ok
          ? { ok: true, summary: `Typography set to ${fonts.heading} / ${fonts.body}` }
          : { ok: false, reason: 'This project has no branding yet.' }
      },
    }),

    proposeNames: tool({
      description:
        'Replace the five business name ideas. Use when the user wants a different naming direction.',
      inputSchema: z.object({
        businessNameIdeas: z
          .array(
            z.object({
              name: z.string().min(2).max(40),
              rationale: z.string().max(200),
            }),
          )
          .length(5),
      }),
      execute: async ({ businessNameIdeas }): Promise<ToolResult> => {
        const ok = await patchBranding(projectId, { businessNameIdeas })
        return ok
          ? { ok: true, summary: `New names: ${businessNameIdeas.map((i) => i.name).join(', ')}` }
          : { ok: false, reason: 'This project has no branding yet.' }
      },
    }),

    updateInstagramBio: tool({
      description: 'Rewrite the Instagram bio. Instagram caps bios at 150 characters.',
      inputSchema: z.object({ instagramBio: z.string().min(10).max(150) }),
      execute: async ({ instagramBio }): Promise<ToolResult> => {
        const [updated] = await db
          .update(socialMediaAssets)
          .set({ instagramBio, updatedAt: new Date() })
          .where(eq(socialMediaAssets.projectId, projectId))
          .returning({ id: socialMediaAssets.id })

        return updated
          ? { ok: true, summary: 'Instagram bio rewritten' }
          : { ok: false, reason: 'This project has no social media kit.' }
      },
    }),

    rewritePost: tool({
      description: 'Rewrite one Instagram post by its position, from 1 to 9.',
      inputSchema: z.object({
        position: z.number().int().min(1).max(9),
        caption: z.string().min(10).max(600),
        hashtags: z.array(z.string().min(2).max(30)).min(3).max(10),
      }),
      execute: async ({ position, caption, hashtags }): Promise<ToolResult> => {
        const [social] = await db
          .select()
          .from(socialMediaAssets)
          .where(eq(socialMediaAssets.projectId, projectId))
          .limit(1)

        if (!social) return { ok: false, reason: 'This project has no social media kit.' }

        const posts = [...social.instagramPosts]
        const index = position - 1
        if (!posts[index]) return { ok: false, reason: `There is no post at position ${position}.` }

        posts[index] = { ...posts[index], caption, hashtags }

        await db
          .update(socialMediaAssets)
          .set({ instagramPosts: posts, updatedAt: new Date() })
          .where(eq(socialMediaAssets.projectId, projectId))

        return { ok: true, summary: `Post ${position} rewritten` }
      },
    }),
  }
}

/**
 * The assistant's grounding.
 *
 * The whole brand is included rather than summarised — a 1M context window
 * makes truncation unnecessary, and a summary is exactly where an assistant
 * starts inventing details it was never given.
 */
export function assistantSystemPrompt(params: {
  projectName: string
  language: 'en' | 'ar'
  branding: BrandingAsset | null
  social: SocialMediaAsset | null
  hasSocial: boolean
}) {
  const { branding } = params

  const brand = branding
    ? [
        `Name ideas: ${branding.businessNameIdeas.map((i) => i.name).join(', ') || '—'}`,
        `Slogan: ${branding.slogan ?? '—'}`,
        `Voice: ${branding.brandVoice ?? '—'}`,
        `Values: ${branding.brandValues.join(', ') || '—'}`,
        `Palette: ${branding.colorPalette ? Object.entries(branding.colorPalette).map(([k, v]) => `${k} ${v}`).join(', ') : '—'}`,
        `Fonts: ${branding.fontRecommendations ? `${branding.fontRecommendations.heading} / ${branding.fontRecommendations.body}` : '—'}`,
        `Story: ${branding.brandStory ?? '—'}`,
      ].join('\n')
    : 'This project has not been generated yet.'

  return `
You are the brand assistant for "${params.projectName}".

You help refine an existing brand identity. You are not a general chatbot: stay
on this brand, and decline unrelated requests briefly.

Reply in ${params.language === 'ar' ? 'Modern Standard Arabic, natural to Gulf readers' : 'English'}.

Current brand:
${brand}
${params.hasSocial ? '\nThis project has a social media kit, so posts and the Instagram bio can be edited.' : '\nThis project has no social media kit.'}

How to work:
- When the user asks for a change, make it with the appropriate tool rather than
  describing what they could do. Acting is the point.
- Change only what was asked. Do not rewrite the palette because the slogan changed.
- After a tool succeeds, confirm in one short sentence what changed. Do not
  repeat the full asset back.
- If a request needs an asset the project does not have, say so plainly.
- You cannot regenerate logo images; that costs credits and lives behind the
  Generate button. Say so if asked.
- Never mention tools, schemas or that you are an AI.
`.trim()
}
