import { z } from 'zod'

import {
  MARKUP,
  NO_MARKUP_MESSAGE,
  PAGE_KEYS,
  type Block,
  contactBlock,
  ctaBlock,
  faqBlock,
  featuresBlock,
  heroBlock,
  hoursBlock,
  quoteBlock,
  richTextBlock,
  servicesBlock,
} from '@/lib/blocks'
import { adItemSchema, socialPostItemSchema } from '@/lib/content'

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
 * Website content, strictly.
 *
 * The shapes come from `@/lib/blocks`, so the AI, the builder and the published
 * renderer cannot drift apart — but the *contract* is tightened here and only
 * here. That split is deliberate: a minimum length in `lib/blocks` would apply
 * to the builder's autosave too, and a customer whose About page is shorter
 * than the model's floor would silently stop being able to save. Strict at
 * generation, lenient at storage.
 *
 * Website copy had no minimums and no descriptions at all: an empty hero
 * subtitle validated and published. `socialSchema` was tightened after exactly
 * this class of incident; this follows it.
 */
const filled = (min: number, max: number, description: string) =>
  z
    .string()
    .min(min)
    .max(max)
    .refine((value) => !MARKUP.test(value), NO_MARKUP_MESSAGE)
    .describe(description)

const strictBlock = z.discriminatedUnion('type', [
  heroBlock.extend({
    title: filled(12, 90, 'The one line that says what this business is'),
    subtitle: filled(30, 200, 'One sentence that earns the next scroll'),
    cta: filled(2, 30, 'What the button says, in the imperative'),
  }),
  featuresBlock.extend({
    heading: filled(6, 80, 'What this section is about'),
    items: z
      .array(
        z.object({
          title: filled(3, 60, 'The benefit, named'),
          body: filled(20, 220, 'Something concrete rather than impressive'),
        }),
      )
      .min(2)
      .max(4),
  }),
  richTextBlock.extend({
    heading: filled(6, 80, 'What this section is about'),
    body: filled(80, 900, 'Two or three short paragraphs, separated by newlines'),
  }),
  servicesBlock.extend({
    heading: filled(6, 80, 'What this section is about'),
    services: z
      .array(
        z.object({
          title: filled(3, 60, 'What the service is called'),
          body: filled(20, 220, 'What it is and who it is for'),
          price: filled(2, 30, 'Only when a real price can be named').optional(),
        }),
      )
      .min(2)
      .max(4),
  }),
  ctaBlock.extend({
    heading: filled(6, 80, 'The ask, in a few words'),
    body: filled(20, 220, 'One sentence on why now'),
    cta: filled(2, 30, 'What the button says, in the imperative'),
  }),
  contactBlock.extend({
    heading: filled(6, 80, 'The invitation to get in touch'),
    body: filled(20, 300, 'How and when they will hear back'),
    /* Free text until now, so "email us" and "info at example dot com" both
       validated and both published as the address. */
    email: z.email().max(80).describe('A working email address, nothing else'),
    phone: filled(6, 40, 'In the local format, with country code').optional(),
  }),
  quoteBlock.extend({
    quote: filled(20, 240, "The brand's own line. Never a customer testimonial"),
    attribution: filled(2, 80, 'The business itself, or a named founder').optional(),
  }),
  faqBlock.extend({
    heading: filled(6, 80, 'What this section is about'),
    items: z
      .array(
        z.object({
          title: filled(10, 120, 'A question this business is actually asked'),
          body: filled(20, 400, 'The answer, plainly'),
        }),
      )
      .min(2)
      .max(6),
  }),
  hoursBlock.extend({
    heading: filled(4, 80, 'Usually "Opening hours"'),
    items: z
      .array(
        z.object({
          title: filled(3, 60, 'A day or a range of days'),
          body: filled(3, 60, 'The hours, or "Closed"'),
        }),
      )
      .min(1)
      .max(7),
    note: filled(10, 160, 'Anything that qualifies the hours').optional(),
  }),
])

/**
 * Arrangement is corrected, not refused.
 *
 * Every structural rule here started as a `.refine()`, and every one of them
 * cost a whole generation when a model missed it: three models in a row failed
 * one run on "two sections next to each other may not be the same block type",
 * which is a thing this code can simply fix. The AI SDK does not feed
 * validation errors back for a repair pass, so a refusal is not a correction —
 * it is a retry from scratch and a bill for the attempt that failed.
 *
 * So the schema stays strict about *content*, where only the model can help —
 * every field filled, real lengths, a working email address, no markup — and
 * the arrangement is put right afterwards, deterministically:
 *
 * - the home page opens on its hero, wherever the model put it
 * - a call to action closes the page rather than interrupting it
 * - two list sections of the same kind side by side become one
 *
 * That last one is not hypothetical either: a café's menu page came back as
 * four consecutive `services` blocks, which renders as four headings with two
 * dishes under each. Merging is what a person would do with them. Moving them
 * apart — which is what this did first — achieves nothing when the whole tail
 * of the page is the same type.
 *
 * The rule this replaces was one block type per page, written to stop a model
 * emitting three identical heroes. The field minimums do that job now, without
 * banning an opening and a closing call to action on the same page.
 */
const LIST_FIELD = { features: 'items', services: 'services', faq: 'items', hours: 'items' } as const
const LIST_MAX = { features: 4, services: 4, faq: 6, hours: 7 } as const

function mergeable(block: Block): block is Block & { type: keyof typeof LIST_FIELD } {
  return block.type in LIST_FIELD
}

function tidy(blocks: Block[], isHome: boolean): Block[] {
  const ordered = [...blocks]

  if (isHome) {
    const hero = ordered.findIndex((block) => block.type === 'hero')
    if (hero > 0) ordered.unshift(...ordered.splice(hero, 1))
  }

  /* A call to action is a closing move. A model put one at the top of a home
     page and made another page out of nothing but a button; sorting them to
     the end is the whole fix, and it keeps their order among themselves. */
  const asks = ordered.filter((block) => block.type === 'cta')
  const rest = ordered.filter((block) => block.type !== 'cta')
  ordered.splice(0, ordered.length, ...(rest.length ? [...rest, ...asks] : asks))

  return ordered.reduce<Block[]>((kept, block) => {
    const previous = kept[kept.length - 1]

    if (previous && previous.type === block.type && mergeable(block) && mergeable(previous)) {
      const field = LIST_FIELD[block.type]
      const merged = [
        ...(previous as unknown as Record<string, unknown[]>)[field],
        ...(block as unknown as Record<string, unknown[]>)[field],
      ].slice(0, LIST_MAX[block.type])

      kept[kept.length - 1] = { ...previous, [field]: merged } as Block
      return kept
    }

    kept.push(block)
    return kept
  }, [])
}

/**
 * Which pages a site has is generated, not assumed.
 *
 * Every business got home/about/services/contact, so a café's coffee was listed
 * on a "Services" page and a consultancy had nowhere to put its rates. The
 * model picks from the vocabulary in `lib/blocks`.
 *
 * A list rather than an object with optional keys, and that is not a stylistic
 * choice: asked for pages as optional fields, GLM-5.2 returned home and contact
 * and nothing else on run after run, because omitting an optional field is free.
 * "Four items in this array" is a constraint a model actually holds on to. The
 * record the rest of the system stores is built from it below.
 */
const pageEntry = z.object({
  key: z.enum(PAGE_KEYS).describe('Which page this is'),
  blocks: z.array(strictBlock).min(1).max(5).describe('The sections on this page, in order'),
})

export const websiteSchema = z
  .object({
    /* Sized against the clock, not against ambition. Four pages of real copy is
       around two thousand tokens; a model writing at thirty a second is at
       seventy before it stops, and the attempt ceiling is ninety. Asking for six
       pages is how a run times out three times and the website section fails
       over nothing. */
    pages: z.array(pageEntry).min(3).max(5),
  })
  .refine(
    ({ pages }) => pages.some((p) => p.key === 'home') && pages.some((p) => p.key === 'contact'),
    'Every site needs a home page and a contact page',
  )
  .refine(
    ({ pages }) => new Set(pages.map((p) => p.key)).size === pages.length,
    'Each page appears once',
  )
  /*
   * A page has to carry what its name promises.
   *
   * A café's menu page came back as an FAQ and a set of opening hours — real
   * copy, on a page called Menu, with no menu on it. This is the one structural
   * rule that cannot be fixed in code: only the model can write the list, and
   * dropping the page would throw away what it did write.
   */
  .refine(
    ({ pages }) =>
      pages.every(
        (p) =>
          !['menu', 'services', 'pricing'].includes(p.key) ||
          p.blocks.some((block) => block.type === 'services'),
      ),
    'A menu, services or pricing page must include a services block — the list is what the page is for',
  )
  .transform(({ pages }) =>
    Object.fromEntries(
      /* Stored in the vocabulary's order rather than the order the model
         happened to emit, because that order is the nav. */
      PAGE_KEYS.flatMap((key) => {
        const found = pages.find((p) => p.key === key)
        return found ? [[key, tidy(found.blocks, key === 'home')] as const] : []
      }),
    ),
  )

export type WebsiteOutput = z.infer<typeof websiteSchema>

/*
 * Every field below had a maximum and no minimum, which is a contract that
 * accepts almost anything. A real run proved it: the primary model timed out,
 * the fallback answered, and what it wrote was stored and shown to a customer —
 * an empty bio, the literal word "test" as all ten hashtags, an empty ad
 * headline, and `<br>` through every caption. Each one satisfied
 * `z.string().max(30)`.
 *
 * The point of tightening it is not tidiness. `runModel` walks a chain of
 * models and only moves on when one *fails*, so a schema that accepts rubbish
 * is a schema that stops the chain on the first model to produce rubbish. These
 * rules are what make that fallback happen.
 */

/**
 * Written to be read as text, so a tag in it is a tag the customer sees.
 *
 * The rule itself lives in `lib/blocks`, which is where the website contract
 * needed it too. One regex, so the two contracts cannot disagree about what
 * counts as markup.
 */
const plain = (min: number, max: number) =>
  z
    .string()
    .min(min)
    .max(max)
    .refine((value) => !MARKUP.test(value), NO_MARKUP_MESSAGE)

/**
 * A hashtag without its hash: letters and numbers in any script.
 *
 * Unicode classes rather than `A-Za-z`, because an Arabic brand's hashtags are
 * Arabic and an ASCII rule would fail every Arabic run in the product.
 *
 * `refine`, not `regex`, and the difference is not style. A `regex` is
 * serialised into the JSON schema sent to the provider as a `pattern`, and
 * Qwen — the primary model for every social task — refuses the request
 * outright rather than the output:
 *
 *   [Alibaba] Format error: 'response_format.json_schema.schema' …
 *   '^[\p{L}\p{N}_]+$' is not supported
 *
 * Which arrives here as "response did not match schema", pointing at the
 * model's writing when the model never wrote anything. A refinement is not
 * serialised, so the rule is enforced exactly as before and the provider never
 * sees a pattern it cannot parse.
 */
const HASHTAG = /^[\p{L}\p{N}_]+$/u
const hashtag = z
  .string()
  .min(3)
  .max(30)
  .refine((value) => HASHTAG.test(value), 'Letters, numbers and underscores only.')

/** Ten of the same word is not a hashtag set. Case-insensitive, as Instagram is. */
const distinct = (values: string[]) =>
  new Set(values.map((value) => value.toLowerCase())).size === values.length

export const socialSchema = z.object({
  instagramBio: plain(30, 150).describe('Instagram caps bios at 150 characters'),
  instagramPosts: z
    .array(
      z.object({
        type: z
          .string()
          .min(3)
          .max(30)
          .describe('e.g. introduction, product, testimonial, behind-the-scenes'),
        caption: plain(60, 600).describe('Plain text. Line breaks are newlines, never <br>.'),
        hashtags: z.array(hashtag).min(3).max(10).refine(distinct, 'Hashtags must be distinct.'),
      }),
    )
    .length(9),
  storyTemplates: z
    .array(
      z.object({
        title: plain(3, 60),
        body: plain(10, 200),
      }),
    )
    .length(3),
  adCopy: z.object({
    /*
     * Eighty, because sixty was being treated as the target.
     *
     * One project's headline is "Stop eating sad, thin snacks! We are Chunky,
     * and we are here" — exactly sixty characters, stopping mid-sentence. The
     * model writes up to the ceiling it is given, so a ceiling set at the
     * length of a good headline guarantees the occasional bad one. The system
     * prompt now says limits are a ceiling and not a target; this is the room
     * to obey it in. Nothing renders this in a fixed box.
     */
    headline: plain(10, 80),
    body: plain(40, 300),
    cta: plain(2, 30),
    facebookAd: plain(40, 400),
    googleAd: plain(20, 200),
  }),
  hashtags: z.array(hashtag).length(10).refine(distinct, 'Hashtags must be distinct.'),
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

/**
 * One generation's worth of ads, pinned to the count that was priced.
 *
 * Same reasoning as the captions above: the number is a control the customer
 * set and the quote was made against it, so a miscount is a schema violation
 * and a retry rather than a surprise on the invoice.
 *
 * The item shape comes from `lib/content.ts` for the same reason too — the
 * model writes it, the column stores it and the library reads it back, and
 * three declarations of one shape drift.
 */
export function contentAdSchemaFor(variants: number) {
  return z.object({
    title: z.string().min(1).max(80),
    items: z.array(adItemSchema).length(variants),
  })
}

/**
 * A carousel's words, pinned to the number of frames that will be drawn.
 *
 * The length is the layout's, not a guess: the line is set at display size over
 * artwork, so a long one shrinks the type until the frame stops looking like
 * the brand's. Seventy, not sixty — at sixty every model in the chain failed
 * the whole set on a brief that wanted slightly longer lines, which is the same
 * defect the ad headline had: a ceiling set at the length of a good line is one
 * the model writes up to and overshoots. The prompt now asks for eight words,
 * and this is the room to miss by a little without losing the carousel.
 *
 * `.length(frames)` for the reason the caption schema pins its count: the
 * number of frames is a thing the customer is charged against, so a model
 * returning four when five were bought is a schema violation, not a surprise
 * to notice later.
 */
export function contentCarouselSchemaFor(frames: number) {
  return z.object({
    title: z.string().min(1).max(80),
    frames: z
      .array(
        z.object({
          /*
           * One line, and only one.
           *
           * A second line was asked for and then silently dropped: in these
           * layouts `tail` is the accent-coloured *end of the headline* and
           * `body` is prose only some of them set, so a supporting sentence
           * had nowhere reliable to land. It rendered on none of the three
           * layouts a project without photography gets.
           *
           * Charging for words that are not drawn is worse than not offering
           * them. One line per frame is what the artwork actually sets.
           */
          lead: plain(3, 70).describe('The line set large on the frame'),
        }),
      )
      .length(frames),
    caption: plain(60, 600).describe('The post body beneath the frames'),
    hashtags: z.array(hashtag).min(3).max(10).refine(distinct, 'Hashtags must be distinct.'),
  })
}

export type ContentCarouselOutput = z.infer<ReturnType<typeof contentCarouselSchemaFor>>

/**
 * A story's words: a title to find it by, and the one line set on the picture.
 *
 * No caption and no hashtags, because a story has nowhere to put them. Asking a
 * model for copy the product then throws away is how a prompt starts drifting
 * from what the artwork can hold.
 */
export const contentStorySchema = z.object({
  title: z.string().min(1).max(80),
  lead: plain(3, 70).describe('The line set large on the story'),
})

export type ContentStoryOutput = z.infer<typeof contentStorySchema>
