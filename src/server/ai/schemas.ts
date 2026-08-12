import { z } from 'zod'

import { MARKUP, NO_MARKUP_MESSAGE, blockSchema } from '@/lib/blocks'
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
