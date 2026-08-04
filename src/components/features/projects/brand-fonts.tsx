import type { BrandFonts } from '@/lib/brand-theme'

/**
 * Loads the brand's own faces, so a specimen of them is actually a specimen.
 *
 * Without this the page named Syne and Inter and then set both in Plus Jakarta
 * Sans, because a generated family is only a Google Fonts name and the visitor
 * is unlikely to have it installed. A brand book that renders every brand in
 * the same face is a list of font names, not a book.
 *
 * React hoists this link into the document head. When the request fails — an
 * offline visitor, a blocked host, a family that does not exist — nothing
 * breaks: `fontStack` already falls back to the app's own face, and the family
 * name is printed beside every specimen regardless.
 */
export function BrandFonts({ fonts }: { fonts: BrandFonts }) {
  if (!fonts) return null

  /*
   * These names come out of a language model, so they are treated as untrusted
   * input rather than as a value: anything that is not a letter, a digit or a
   * space is dropped, which leaves nothing that could break out of the query
   * parameter it is interpolated into.
   */
  const families = [fonts.heading, fonts.body, fonts.accent]
    .filter((family): family is string => Boolean(family))
    .map((family) => family.replace(/[^a-zA-Z0-9 ]/g, '').trim().slice(0, 48))
    .filter(Boolean)

  const unique = [...new Set(families)]
  if (unique.length === 0) return null

  const query = unique
    .map((family) => `family=${encodeURIComponent(family).replace(/%20/g, '+')}:wght@400;500;600;700`)
    .join('&')

  return (
    <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?${query}&display=swap`} />
  )
}
