import { z } from 'zod'

import { blockSchema } from '@/lib/blocks'
import { socialPostItemSchema } from '@/lib/content'

/**
 * Structured output contracts.
 *
 * Every model call goes through `generateObject` with one of these, so a
 * malformed response is a typed retry rather than a runtime crash downstream.
 * Keep them strict: the constraints here are what stop a model from returning
 * four name ideas when the UI renders five.
 */

const hex = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a 6-digit hex colour')
  .describe('Hex colour, e.g. #7c3aed')

export const brandingSchema = z.object({
  businessNameIdeas: z
    .array(
      z.object({
        name: z.string().min(2).max(40),
        rationale: z.string().max(200).describe('One sentence on why this name works'),
      }),
    )
    .length(5),
  slogan: z.string().min(3).max(80),
  brandStory: z.string().min(150).max(1500).describe('Two or three short paragraphs'),
  colorPalette: z.object({
    primary: hex,
    secondary: hex,
    accent: hex,
    background: hex,
    text: hex.describe('Must meet WCAG AA contrast against background'),
  }),
  fontRecommendations: z.object({
    heading: z.string().describe('Google Fonts family name'),
    body: z.string().describe('Google Fonts family name'),
    accent: z.string().optional(),
  }),
  brandValues: z.array(z.string().max(40)).min(3).max(5),
  brandVoice: z.string().max(400),
})

export type BrandingOutput = z.infer<typeof brandingSchema>

/**
 * Website content reuses the shared block contract from `@/lib/blocks`, so the
 * AI, the builder and the published renderer cannot drift apart.
 *
 * A page may not repeat a block type. Without this, a model can satisfy
 * `.min(3)` by emitting the same hero three times — which is exactly what
 * GLM-5.2 did on the first real run. Enforcing it here turns that into a
 * validation failure and a retry rather than duplicates reaching the database.
 */
const distinctBlocks = (blocks: { type: string }[]) =>
  new Set(blocks.map((block) => block.type)).size === blocks.length

const DISTINCT_MESSAGE = 'Each block type may appear at most once per page'

export const websiteSchema = z.object({
  home: z.array(blockSchema).min(3).max(5).refine(distinctBlocks, DISTINCT_MESSAGE),
  about: z.array(blockSchema).min(1).max(3).refine(distinctBlocks, DISTINCT_MESSAGE),
  services: z.array(blockSchema).min(1).max(3).refine(distinctBlocks, DISTINCT_MESSAGE),
  contact: z.array(blockSchema).min(1).max(2).refine(distinctBlocks, DISTINCT_MESSAGE),
})

export type WebsiteOutput = z.infer<typeof websiteSchema>

export const socialSchema = z.object({
  instagramBio: z.string().max(150).describe('Instagram caps bios at 150 characters'),
  instagramPosts: z
    .array(
      z.object({
        type: z
          .string()
          .max(30)
          .describe('e.g. introduction, product, testimonial, behind-the-scenes'),
        caption: z.string().max(600),
        hashtags: z.array(z.string().max(30)).min(3).max(10),
      }),
    )
    .length(9),
  storyTemplates: z
    .array(
      z.object({
        title: z.string().max(60),
        body: z.string().max(200),
      }),
    )
    .length(3),
  adCopy: z.object({
    headline: z.string().max(60),
    body: z.string().max(300),
    cta: z.string().max(30),
    facebookAd: z.string().max(400),
    googleAd: z.string().max(200),
  }),
  hashtags: z.array(z.string().max(30)).length(10),
})

export type SocialOutput = z.infer<typeof socialSchema>

/* -------------------------------------------------------------------------- */
/*                              Content Studio                                 */
/* -------------------------------------------------------------------------- */

/**
 * One generation's worth of captions.
 *
 * The item shape is imported rather than restated: `lib/content.ts` owns it,
 * because the same objects are stored in `content_items.body` and rendered
 * back. A second declaration here is how the model's output and the column
 * quietly stop agreeing.
 */
export const contentSocialPostSchema = z.object({
  /** A few words to recognise this set by in the library, not a headline. */
  title: z.string().min(1).max(80),
  items: z.array(socialPostItemSchema).min(1).max(5),
})

/**
 * The same contract, pinned to the number of captions the customer asked for.
 *
 * Asked for three, the model returned five — allowed by a `max(5)` schema, and
 * wrong: the count is a control the customer set, and the price is quoted
 * against it. Pinning the length makes a miscount a schema violation, which is
 * a retry down the model chain rather than something to notice later.
 */
export function contentSocialPostSchemaFor(variants: number) {
  return z.object({
    title: z.string().min(1).max(80),
    items: z.array(socialPostItemSchema).length(variants),
  })
}

export type ContentSocialPostOutput = z.infer<typeof contentSocialPostSchema>
