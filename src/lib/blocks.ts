import { z } from 'zod'

/**
 * The website content contract.
 *
 * One definition shared by three consumers: the AI schema that generates
 * content, the builder that edits it, and the renderer that publishes it. If
 * these ever diverged, a preview could show something the published site
 * cannot render — so they deliberately cannot.
 */

export const heroBlock = z.object({
  type: z.literal('hero'),
  title: z.string().max(90),
  subtitle: z.string().max(200),
  cta: z.string().max(30),
})

export const featuresBlock = z.object({
  type: z.literal('features'),
  heading: z.string().max(80),
  items: z
    .array(z.object({ title: z.string().max(60), body: z.string().max(220) }))
    .min(1)
    .max(4),
})

export const richTextBlock = z.object({
  type: z.literal('richText'),
  heading: z.string().max(80),
  body: z.string().max(900),
})

export const servicesBlock = z.object({
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
    .min(1)
    .max(4),
})

export const ctaBlock = z.object({
  type: z.literal('cta'),
  heading: z.string().max(80),
  body: z.string().max(220),
  cta: z.string().max(30),
})

export const contactBlock = z.object({
  type: z.literal('contact'),
  heading: z.string().max(80),
  body: z.string().max(300),
  email: z.string().max(80),
  phone: z.string().max(40).optional(),
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
