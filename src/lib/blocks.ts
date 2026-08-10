import { z } from 'zod'

/**
 * The website content contract.
 *
 * One definition shared by three consumers: the AI schema that generates
 * content, the builder that edits it, and the renderer that publishes it. If
 * these ever diverged, a preview could show something the published site
 * cannot render — so they deliberately cannot.
 */

/**
 * A tag in a text field is a tag the customer sees.
 *
 * Every block below renders through React, which escapes what it is given, so
 * a `<br>` in a heading is published as the four characters `<br>` in the
 * middle of a sentence. This is the rule `socialSchema` already carries, moved
 * somewhere both contracts can share it — the same glm-5.2 that wrote `<br>`
 * through nine Instagram captions is the primary model for website copy, and
 * only one of the two contracts had anything to say about it.
 *
 * Nothing stored today is affected: every project's blocks check clean. The
 * exposure was identical, not the damage.
 */
export const MARKUP = /<\s*\/?[a-zA-Z][a-zA-Z0-9-]*\s*\/?>/
export const NO_MARKUP_MESSAGE = 'Plain text only — no HTML tags.'

/** A block's text field: capped, and text rather than markup. */
const text = (max: number) =>
  z
    .string()
    .max(max)
    .refine((value) => !MARKUP.test(value), NO_MARKUP_MESSAGE)

export const heroBlock = z.object({
  type: z.literal('hero'),
  title: text(90),
  subtitle: text(200),
  cta: text(30),
})

export const featuresBlock = z.object({
  type: z.literal('features'),
  heading: text(80),
  items: z
    .array(z.object({ title: text(60), body: text(220) }))
    .min(1)
    .max(4),
})

export const richTextBlock = z.object({
  type: z.literal('richText'),
  heading: text(80),
  body: text(900),
})

export const servicesBlock = z.object({
  type: z.literal('services'),
  heading: text(80),
  services: z
    .array(
      z.object({
        title: text(60),
        body: text(220),
        price: text(30).optional(),
      }),
    )
    .min(1)
    .max(4),
})

export const ctaBlock = z.object({
  type: z.literal('cta'),
  heading: text(80),
  body: text(220),
  cta: text(30),
})

export const contactBlock = z.object({
  type: z.literal('contact'),
  heading: text(80),
  body: text(300),
  email: text(80),
  phone: text(40).optional(),
})

export const blockSchema = z.discriminatedUnion('type', [
  heroBlock,
  featuresBlock,
  richTextBlock,
  servicesBlock,
  ctaBlock,
  contactBlock,
])

export type Block = z.infer<typeof blockSchema>
export type BlockType = Block['type']

export const PAGE_KEYS = ['home', 'about', 'services', 'contact'] as const
export type PageKey = (typeof PAGE_KEYS)[number]

export const pagesSchema = z.object({
  home: z.array(blockSchema),
  about: z.array(blockSchema),
  services: z.array(blockSchema),
  contact: z.array(blockSchema),
})

export type Pages = z.infer<typeof pagesSchema>

export const themeSchema = z.object({
  primaryColor: z.string().max(20).optional(),
  secondaryColor: z.string().max(20).optional(),
  backgroundColor: z.string().max(20).optional(),
  textColor: z.string().max(20).optional(),
  fontHeading: z.string().max(60).optional(),
  fontBody: z.string().max(60).optional(),
})

export type Theme = z.infer<typeof themeSchema>

export const BLOCK_TYPES: BlockType[] = [
  'hero',
  'features',
  'richText',
  'services',
  'cta',
  'contact',
]

/** Starting content when a block is dragged in from the library. */
export function createBlock(type: BlockType): Block {
  switch (type) {
    case 'hero':
      return { type, title: 'Your headline here', subtitle: 'A sentence that earns the next scroll.', cta: 'Get started' }
    case 'features':
      return {
        type,
        heading: 'What you get',
        items: [
          { title: 'First benefit', body: 'Say something concrete rather than impressive.' },
          { title: 'Second benefit', body: 'Say something concrete rather than impressive.' },
          { title: 'Third benefit', body: 'Say something concrete rather than impressive.' },
        ],
      }
    case 'richText':
      return { type, heading: 'About us', body: 'Tell the story in a few short paragraphs.' }
    case 'services':
      return {
        type,
        heading: 'Services',
        services: [
          { title: 'First service', body: 'What it is and who it is for.' },
          { title: 'Second service', body: 'What it is and who it is for.' },
        ],
      }
    case 'cta':
      return { type, heading: 'Ready to start?', body: 'One clear next step.', cta: 'Contact us' }
    case 'contact':
      return { type, heading: 'Get in touch', body: 'We reply within one working day.', email: 'hello@example.com' }
  }
}

/**
 * A stable identity for a block within its page.
 *
 * Blocks are stored as a plain ordered array with no ids — that is what the AI
 * emits and what the renderer consumes. Drag-and-drop needs stable keys, so
 * the builder derives them from position rather than mutating the stored shape.
 */
export function blockKey(index: number) {
  return `block-${index}`
}
