import { z } from 'zod'

/**
 * What a piece of generated content is, as data.
 *
 * Shared rather than declared twice, for the reason `lib/blocks.ts` is shared:
 * the model that writes it, the database column that stores it and the view
 * that renders it are three places one shape can drift apart. Importing the
 * same schema into all three makes a mismatch a type error instead of an empty
 * card in production.
 *
 * Only `social_post` exists so far. The union is written as a discriminated
 * union from the start so the second type is an addition rather than a rewrite.
 */

/** One caption a customer can post as-is. */
export const socialPostItemSchema = z.object({
  /*
   * What this caption is for — "launch", "behind the scenes". The model picks
   * it, so three variants come back as three angles rather than three
   * rewordings of one.
   *
   * Sixty, not forty: at forty the model kept writing a phrase and cutting it
   * off mid-clause to fit, which reads worse than a longer label.
   */
  intent: z.string().min(1).max(60),
  caption: z.string().min(1).max(600),
  hashtags: z.array(z.string().min(1).max(30)).min(3).max(10),
})

export const socialPostBodySchema = z.object({
  kind: z.literal('social_post'),
  items: z.array(socialPostItemSchema).min(1).max(5),
})

/**
 * One frame of a carousel: a rendered image, and the words that were set on it.
 *
 * One line, because one line is what the artwork sets — see the note in
 * `ai/schemas.ts`. The line is kept beside the file id rather than left in the
 * picture alone.
 * It is what the library lists, what a screen reader is given for the image,
 * and what a customer copies when they write the post the carousel goes into —
 * none of which can be got back out of a PNG.
 */
export const carouselFrameSchema = z.object({
  fileId: z.uuid(),
  /** Which of the kit's layouts drew it — 'hero', 'statement', and so on. */
  layout: z.string().min(1).max(40),
  lead: z.string().min(1).max(120),
})

/**
 * A story: one frame, portrait, and no caption.
 *
 * It reuses the carousel's frame shape because it is the same thing — a
 * rendered image and the line set on it — and differs only in count and
 * proportion. What it does not have is a caption or hashtags: a story is
 * posted as a picture, and words attached to it would be words with nowhere
 * to go.
 */
export const storyBodySchema = z.object({
  kind: z.literal('story'),
  frames: z.array(carouselFrameSchema).length(1),
})

export const carouselBodySchema = z.object({
  kind: z.literal('carousel'),
  frames: z.array(carouselFrameSchema).min(1).max(10),
  /** The caption for the post the frames are attached to. */
  caption: z.string().min(1).max(600),
  hashtags: z.array(z.string().min(1).max(30)).min(3).max(10),
})

/**
 * One ad: an angle, a headline, the body, and what the button says.
 *
 * Four fields rather than a caption, because that is what every paid placement
 * asks for — Meta wants primary text and a headline separately, Google wants a
 * headline and a description, and both want the call to action as its own
 * string. A blob of caption text has to be pulled apart by hand before it can
 * be pasted anywhere, which is precisely the state a kit's ad copy is in today.
 *
 * The headline ceiling is eighty and not sixty, and the reason is written into
 * `ai/schemas.ts` beside the kit's: a ceiling set at the length of a good
 * headline is a target, and the model writes up to it and stops mid-sentence.
 */
export const adItemSchema = z.object({
  /** The angle — "problem-led", "social proof". A label, not a sentence. */
  intent: z.string().min(1).max(60),
  headline: z.string().min(1).max(80),
  body: z.string().min(1).max(300),
  /** What the button says. "Shop now", not "Click here to shop now!". */
  cta: z.string().min(1).max(30),
})

export const adBodySchema = z.object({
  kind: z.literal('ad'),
  items: z.array(adItemSchema).min(1).max(3),
})

export const contentBodySchema = z.discriminatedUnion('kind', [
  socialPostBodySchema,
  carouselBodySchema,
  storyBodySchema,
  adBodySchema,
])

export type AdItem = z.infer<typeof adItemSchema>
export type AdBody = z.infer<typeof adBodySchema>
export type SocialPostItem = z.infer<typeof socialPostItemSchema>
export type SocialPostBody = z.infer<typeof socialPostBodySchema>
export type CarouselFrame = z.infer<typeof carouselFrameSchema>
export type CarouselBody = z.infer<typeof carouselBodySchema>
export type StoryBody = z.infer<typeof storyBodySchema>
export type ContentBody = z.infer<typeof contentBodySchema>

/**
 * The types a customer can ask for today.
 *
 * The database enum carries every type the roadmap names; this carries the ones
 * that are built. The composer reads this, so an unbuilt type cannot be offered
 * by a form control that has nothing behind it.
 *
 * `ad` is here because the copy already existed and had nowhere to go: every
 * social kit writes a headline, a body and a call to action, once, at the
 * moment the brand is generated — and a customer who wants a second one for a
 * different campaign has no way to ask.
 */
export const BUILT_CONTENT_TYPES = ['social_post', 'carousel', 'story', 'ad'] as const
export type BuiltContentType = (typeof BUILT_CONTENT_TYPES)[number]

/**
 * Types whose output is pictures rather than text, and which therefore cannot
 * be produced inside the request that asks for them.
 *
 * Every frame launches its own Chromium and pays about ten seconds for it —
 * see `render/browser.ts` for why a reused browser was measured and rejected.
 * Five frames is most of a minute before the model has written anything, and
 * a request the platform kills with a credit hold open is the failure the
 * whole async pipeline exists to prevent.
 */
export const RENDERED_CONTENT_TYPES = ['carousel', 'story'] as const
export function isRenderedType(type: BuiltContentType) {
  return (RENDERED_CONTENT_TYPES as readonly string[]).includes(type)
}

/**
 * Frames in a carousel.
 *
 * Five is what Instagram shows a swipe hint for and what the layouts can fill
 * without repeating themselves — there are eight, and three of them need a
 * photograph the project may not have.
 */
export const CAROUSEL_FRAMES = 5

/**
 * The layout a story is drawn on, and the only portrait one there is.
 *
 * 1080×1920, and it needs a photograph — which is the whole shape of a story,
 * so there is no text-only fallback to offer. A project with no kit is told to
 * make one rather than sold a story that cannot be drawn.
 */
export const STORY_LAYOUT = 'story'
export const STORY_SCENE = 'hero'

/** How many independent captions one generation may ask for. */
export const MAX_VARIANTS = 3

/** Longest brief we send to the model — roughly a short paragraph. */
export const MAX_BRIEF = 500
