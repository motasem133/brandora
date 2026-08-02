import { z } from 'zod'

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
 * Website content is emitted as typed blocks so the builder and the published
 * renderer share one shape. See the Block union in §5 of the documentation.
 */
const heroBlock = z.object({
  type: z.literal('hero'),
  title: z.string().max(90),
  subtitle: z.string().max(200),
  cta: z.string().max(30),
})

const featuresBlock = z.object({
  type: z.literal('features'),
  heading: z.string().max(80),
  items: z
    .array(
      z.object({
        title: z.string().max(60),
        body: z.string().max(220),
      }),
    )
    .min(3)
    .max(4),
})

const richTextBlock = z.object({
  type: z.literal('richText'),
  heading: z.string().max(80),
  body: z.string().max(900),
})

const servicesBlock = z.object({
  type: z.literal('services'),
  heading: z.string().max(80),
  services: z
    .array(
      z.object({
        title: z.string().max(60),
        body: z.string().max(220),
        price: z.string().max(30).optional(),
      }),
    )
    .min(3)
    .max(4),
})

const ctaBlock = z.object({
  type: z.literal('cta'),
  heading: z.string().max(80),
  body: z.string().max(220),
  cta: z.string().max(30),
})

const contactBlock = z.object({
  type: z.literal('contact'),
  heading: z.string().max(80),
  body: z.string().max(300),
  email: z.string().max(80),
  phone: z.string().max(40).optional(),
})

export const websiteBlockSchema = z.discriminatedUnion('type', [
  heroBlock,
  featuresBlock,
  richTextBlock,
  servicesBlock,
  ctaBlock,
  contactBlock,
])

export const websiteSchema = z.object({
  home: z.array(websiteBlockSchema).min(3).max(5),
  about: z.array(websiteBlockSchema).min(1).max(3),
  services: z.array(websiteBlockSchema).min(1).max(3),
  contact: z.array(websiteBlockSchema).min(1).max(2),
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
