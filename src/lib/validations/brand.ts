import { z } from 'zod'

/**
 * What a brand's written fields are allowed to be.
 *
 * One definition, two writers. The Brand Assistant has been able to change
 * these since it shipped — ten validated tools writing straight into
 * `branding_assets` — while the customer could only read them, so the cheapest
 * possible edit ("change one word in my slogan") meant either paying for a
 * feature or paying credits to regenerate something nobody asked for.
 *
 * These bounds are the assistant's own, lifted out of `server/ai/assistant.ts`
 * rather than restated: a person editing by hand and a model editing on their
 * behalf must be held to exactly the same contract, or the assistant becomes a
 * way to write something the form would have refused.
 *
 * The minimums are not decoration. `brandStory` renders as paragraphs and
 * `brandValues` as a row of chips, and both look broken far below these
 * numbers — which is why the generator is held to them too.
 */
export const BRAND_COPY_BOUNDS = {
  slogan: { min: 3, max: 80 },
  brandStory: { min: 150, max: 1500 },
  brandVoice: { min: 20, max: 400 },
  /** Count of values, and the length of each one. */
  brandValues: { min: 3, max: 5, itemMin: 2, itemMax: 40 },
} as const

const B = BRAND_COPY_BOUNDS

/**
 * The schemas, derived from the numbers above rather than repeating them.
 *
 * The editor tells the customer "between 150 and 1500 characters" before they
 * start typing, and a hint that says one thing while the validator does
 * another is worse than no hint — so both read the same object.
 */
export const brandCopy = {
  slogan: z.string().trim().min(B.slogan.min).max(B.slogan.max),
  brandStory: z.string().trim().min(B.brandStory.min).max(B.brandStory.max),
  brandVoice: z.string().trim().min(B.brandVoice.min).max(B.brandVoice.max),
  brandValues: z
    .array(z.string().trim().min(B.brandValues.itemMin).max(B.brandValues.itemMax))
    .min(B.brandValues.min)
    .max(B.brandValues.max),
} as const

/** The fields a customer can edit by hand, as a patch of one or more. */
export const brandCopyPatch = z
  .object({
    slogan: brandCopy.slogan.optional(),
    brandStory: brandCopy.brandStory.optional(),
    brandVoice: brandCopy.brandVoice.optional(),
    brandValues: brandCopy.brandValues.optional(),
  })
  .refine((patch) => Object.keys(patch).length > 0, 'Nothing to change.')

export type BrandCopyField = keyof typeof brandCopy
