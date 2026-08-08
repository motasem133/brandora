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

export const contentBodySchema = z.discriminatedUnion('kind', [socialPostBodySchema])

export type SocialPostItem = z.infer<typeof socialPostItemSchema>
export type SocialPostBody = z.infer<typeof socialPostBodySchema>
export type ContentBody = z.infer<typeof contentBodySchema>

/**
 * The types a customer can ask for today.
 *
 * The database enum carries every type the roadmap names; this carries the ones
 * that are built. The composer reads this, so an unbuilt type cannot be offered
 * by a form control that has nothing behind it.
 */
export const BUILT_CONTENT_TYPES = ['social_post'] as const
export type BuiltContentType = (typeof BUILT_CONTENT_TYPES)[number]

/** How many independent captions one generation may ask for. */
export const MAX_VARIANTS = 3

/** Longest brief we send to the model — roughly a short paragraph. */
export const MAX_BRIEF = 500
