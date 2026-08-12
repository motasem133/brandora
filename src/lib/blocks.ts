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

/**
 * Where a button goes.
 *
 * Optional, and validated rather than trusted: an `href` is the one field on a
 * customer's site that a browser *executes* if it is allowed to, so
 * `javascript:` and `data:` are refused here rather than at the renderer. Only
 * the four forms a small business site has any use for — an external link, a
 * mail or phone link, or a path on its own site.
 *
 * Absent on every block stored today, and that stays fine: the button falls
 * back to the contact page, which is where it went before this field existed.
 */
export const LINK = /^(https?:\/\/|mailto:|tel:|\/)/
export const LINK_MESSAGE = 'Use a full https:// address, a mailto:/tel: link, or a path beginning with /.'

const href = z.string().max(300).regex(LINK, LINK_MESSAGE).optional()

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
  ctaHref: href,
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
  ctaHref: href,
})

export const contactBlock = z.object({
  type: z.literal('contact'),
  heading: text(80),
  body: text(300),
  email: text(80),
  phone: text(40).optional(),
})

/**
 * The brand's own line, set as a line.
 *
 * Deliberately not a testimonial. A model asked for what a customer's customers
 * say will write one, and a fabricated quote from a person who does not exist is
 * a lie printed on a real business's website. This block carries the brand's own
 * promise — the slogan, the founding sentence — and the builder is where a
 * customer types a real testimonial once they have one.
 */
export const quoteBlock = z.object({
  type: z.literal('quote'),
  quote: text(240),
  attribution: text(80).optional(),
})

/**
 * Questions, in the shape every list block here already uses.
 *
 * `items` with `title`/`body` rather than `question`/`answer` on purpose: the
 * builder's inspector edits list blocks generically off that shape, so this
 * arrives editable without a bespoke editor. It is also what a FAQ structured
 * data block will read from later.
 */
export const faqBlock = z.object({
  type: z.literal('faq'),
  heading: text(80),
  items: z
    .array(z.object({ title: text(120), body: text(400) }))
    .min(1)
    .max(8),
})

/**
 * When the doors are open — the single most-looked-for fact on the site of a
 * business with a door, and one this product had no way to say.
 */
export const hoursBlock = z.object({
  type: z.literal('hours'),
  heading: text(80),
  /** `title` is the day or range, `body` the hours. Same shape as `faq`. */
  items: z
    .array(z.object({ title: text(60), body: text(60) }))
    .min(1)
    .max(7),
  note: text(160).optional(),
})

export const blockSchema = z.discriminatedUnion('type', [
  heroBlock,
  featuresBlock,
  richTextBlock,
  servicesBlock,
  ctaBlock,
  contactBlock,
  quoteBlock,
  faqBlock,
  hoursBlock,
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
  'quote',
  'faq',
  'hours',
  'cta',
  'contact',
]

/**
 * A new block, empty.
 *
 * It used to arrive holding sample copy — "Tell the story in a few short
 * paragraphs", "One clear next step" — and those exact sentences are live on a
 * customer's published website today. Nobody ignored a warning: the canvas
 * showed prose in the right typeface in the right place, which is what a
 * finished section looks like, and the builder never said otherwise.
 *
 * Empty cannot be mistaken for finished. What the sample copy was trying to
 * teach now lives in the inspector as field placeholders, where it is guidance
 * rather than content, and where it cannot be published by not being read.
 */
export function createBlock(type: BlockType): Block {
  switch (type) {
    case 'hero':
      return { type, title: '', subtitle: '', cta: '' }
    case 'features':
      return { type, heading: '', items: [{ title: '', body: '' }] }
    case 'richText':
      return { type, heading: '', body: '' }
    case 'services':
      return { type, heading: '', services: [{ title: '', body: '' }] }
    case 'cta':
      return { type, heading: '', body: '', cta: '' }
    case 'contact':
      return { type, heading: '', body: '', email: '' }
    case 'quote':
      return { type, quote: '', attribution: '' }
    case 'faq':
      return { type, heading: '', items: [{ title: '', body: '' }] }
    case 'hours':
      return { type, heading: '', items: [{ title: '', body: '' }] }
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
