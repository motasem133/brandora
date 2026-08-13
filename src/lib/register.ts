/**
 * Which register a brand speaks in.
 *
 * The kit learned this first: a coffee roaster and a fintech got the same
 * arrangement with the palette swapped, and a palette is not a design. Colour
 * and typeface already differ per brand; the *bearing* — how much room, how the
 * type ranges, whether corners are cut square, how much of the palette runs as
 * field — was identical for everyone, and it is the part a person actually
 * reads as "this is a different kind of business".
 *
 * The classifier lives here rather than beside the kit's values because the
 * website needs the same judgement and cannot import it: `post-template.ts` is
 * `server-only`, and the site renderer also runs in the builder, in the
 * browser. So the *name* is shared and each surface keeps its own values — the
 * kit's are in 1080-space pixels for a Chromium render, the site's are CSS
 * lengths that have to hold from a phone to a desktop. A shared table would
 * have to be one or the other, and would be wrong for the other.
 *
 * Chosen from fields the project already carries — the style the customer
 * picked in the wizard and the industry they typed — so nothing new is asked of
 * anyone, and an existing brand gets its register without being regenerated.
 */
export type RegisterName = 'editorial' | 'loud' | 'refined' | 'organic'

export const REGISTER_NAMES = ['editorial', 'loud', 'refined', 'organic'] as const

/** Trades a brand's own words for one of four bearings. */
export function registerFor(style: string | null, industry: string | null): RegisterName {
  if (style === 'luxury' || style === 'arabic' || style === 'elegant') return 'refined'
  if (style === 'bold' || style === 'playful') return 'loud'
  if (/food|beverage|coffee|craft|beauty|wellness|floris|bakery/i.test(industry ?? '')) return 'organic'
  return 'editorial'
}

/** A name a caller supplied, or nothing — for the preview harness. */
export function asRegister(value: string | null | undefined): RegisterName | undefined {
  return REGISTER_NAMES.includes(value as RegisterName) ? (value as RegisterName) : undefined
}
