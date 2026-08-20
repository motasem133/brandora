import { brandTheme } from '@/lib/brand-theme'

/**
 * The one run this page is built out of.
 *
 * Sultana — a Syrian kitchen — rather than the earlier coffee brand, because it
 * is the project that exercises most of what the product now does: two concepts
 * at 1536, a true vector trace, transparent variants, and a social kit. Nothing
 * here is a mockup; every file is what a customer downloads.
 *
 * It does *not* exercise Arabic. This comment used to claim "an Arabic wordmark
 * that has to shape correctly" and there is no such file: open
 * `sultana-wordmark.webp` and `sultana-name.webp` and both are Latin, which is
 * what PRODUCT.md, the memory of the 15 Aug critique and `arabic-proof.tsx` all
 * say too. The brief was written in English. Anything selling native Arabic has
 * to demonstrate it some other honest way until a run from an Arabic brief
 * exists — see the note in `arabic-proof.tsx` for the one currently used.
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
 *
 * Four files, two concepts. Read them: `wordmark` is the first concept — the
 * figure above a patterned bowl, name set beside it. `icon` is the second — a
 * woven roundel around a cooking pot, name stacked under it — and `symbol` is
 * that same second concept with the name taken off. `name` is the wordmark
 * alone, in the brand's own face, which both concepts share.
 *
 * **The order is load-bearing.** `Landing.kitLogoNames` names these by position,
 * so a mark that moves here is a mark mislabelled on the page. That labelling is
 * why the grid can claim two concepts over four tiles and be checkable by
 * looking, which is what it was not when all four sat unlabelled under a heading
 * saying "Two logo concepts".
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
 * Illustrative chrome, deliberately not a link — but no longer for the reason
 * this comment gave. Customer subdomains resolve since the zone move on 18 Aug
 * 2026; `zzznotreal.brandora.enigmitic.com` answers 404 from the app rather
 * than failing to resolve. What is true is narrower: *Sultana* is a marketing
 * example and was never published, so its address 404s, and a dead href on the
 * tile that promises a live website is worse than no href. What the tile has to
 * make clear is the *form* of the address, and this says it.
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
