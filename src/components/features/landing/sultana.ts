import { brandTheme } from '@/lib/brand-theme'

/**
 * The one run this page is built out of.
 *
 * Sultana — a Syrian kitchen — rather than the earlier coffee brand, because it
 * is the project that exercises everything the product now does: two concepts at
 * 1536, a true vector trace, transparent variants, an Arabic wordmark that has
 * to shape correctly, and a social kit. Nothing here is a mockup; every file is
 * what a customer downloads.
 *
 * These constants were declared at the top of `page.tsx` and are now read by the
 * hero's replay, the contact sheet and the Arabic panel. Three copies of an
 * asset list is how one of them ends up pointing at a file that was renamed.
 */

/*
 * Rendered from the run's vector traces, not its raster previews. The previews
 * were downsampled generations — soft edges, mush in the lattice, and a paper
 * background baked in, which put a cream rectangle inside every white tile.
 * Traced, stripped of that paper and trimmed, each mark is transparent and
 * fills its tile, so every one of these carries its own ratio.
 */
export const LOGOS = [
  { src: '/marketing/sultana-wordmark.webp', width: 1200, height: 464 },
  { src: '/marketing/sultana-icon.webp', width: 1200, height: 980 },
  { src: '/marketing/sultana-symbol.webp', width: 1200, height: 792 },
  { src: '/marketing/sultana-name.webp', width: 1200, height: 260 },
] as const

/**
 * The posts the kit produced for that same run, at the size the renderer wrote
 * them. They were 900px re-encodes of these 1080px files, which cost a
 * downscale and a second lossy pass to show the same picture.
 */
export const POSTS = [
  '/marketing/sultana-post-hero.webp',
  '/marketing/sultana-post-feature.webp',
  '/marketing/sultana-post-detail.webp',
  '/marketing/sultana-post-palette.webp',
] as const

/** Sultana's own palette, as the run wrote it. */
export const PALETTE = ['#1B3A3A', '#D4A853', '#F43F5E', '#FEFAF5'] as const

/** The two faces the run chose. */
export const FONTS = { heading: 'Reem Kufi Ink', body: 'El Messiri' } as const

export const BRAND_KIT_PDF = '/marketing/sultana-brand-kit.pdf'

/**
 * The address shape a published site takes.
 *
 * Illustrative chrome, deliberately not a link: customer subdomains do not
 * resolve yet, and a dead href on the tile that promises a live website is
 * worse than no href. What the tile has to make clear is the *form* of the
 * address, and this says it.
 */
export const SITE_ADDRESS = 'sultana.brandora.enigmitic.com'

/**
 * Sultana's palette turned into a surface the page can hand itself to.
 *
 * Every colour that ends up under text here is contrast-checked against its own
 * paper by `brandTheme` — the same arithmetic the in-app brand scopes use, so
 * the light sections of this page cannot ship a tone the product would have
 * rejected inside the app. Spread `theme.vars` onto a `.world-light` wrapper and
 * every token in that subtree resolves to this brand.
 */
export const SULTANA = brandTheme({
  primary: PALETTE[0],
  secondary: PALETTE[1],
  accent: PALETTE[2],
  background: PALETTE[3],
  text: PALETTE[0],
})
