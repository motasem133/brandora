import type { BrandPalette } from '@/lib/brand-theme'

/**
 * The brands this page shows, and everything about them that is not copy.
 *
 * One record per run, read by both the hero plate and the kit cabinet. They
 * were declared inside `page.tsx` while only the plate used them, and the
 * moment a second surface needed Sultana's palette that became two places for
 * one brand's colours to be written down and drift apart.
 *
 * Nothing here is invented. Every hex, family and file is what a run produced
 * and what a customer downloaded, which is the constraint `PRODUCT.md` puts on
 * this page: an example brand is real output or it is not shown.
 */
export type Specimen = {
  id: string
  /** The brand's own name, never translated: it is the output, not our copy. */
  name: string
  /** One line about it. See the note at the call site on which is which. */
  line: string
  palette: NonNullable<BrandPalette>
  /** The palette as the run wrote it, laid along the base of the plate. */
  swatches: string[]
  fonts: { heading: string; body: string }
  /**
   * A real file from the run, when one has been exported to `public/`. Absent
   * for a brand whose logo files only exist in R2 — the plate then sets the
   * name in the brand's own heading face rather than showing a mark we would
   * have had to draw, which would make the "real output" claim false.
   */
  mark?: { src: string; width: number; height: number }
  /*
   * What the drawer opens onto. Each is optional and each is rendered only if
   * it has something in it, because the two runs did not leave the same files
   * behind and a section that pretends otherwise has to invent the difference.
   */
  logos: { src: string; width: number; height: number }[]
  posts: string[]
  values: string[]
  pdf?: string
}

/** Everything but the line, which the page supplies from the catalogue. */
export type SpecimenSource = Omit<Specimen, 'line'>

/*
 * Rendered from the run's vector traces, not its raster previews. The previews
 * were downsampled generations — soft edges, mush in the lattice, and a paper
 * background baked in, which put a cream rectangle inside every white tile.
 * Traced, stripped of that paper and trimmed, each mark is transparent and
 * fills its tile, so every one of these carries its own ratio.
 */
const SULTANA_LOGOS = [
  { src: '/marketing/sultana-wordmark.webp', width: 1200, height: 464 },
  { src: '/marketing/sultana-icon.webp', width: 1200, height: 980 },
  { src: '/marketing/sultana-symbol.webp', width: 1200, height: 792 },
  { src: '/marketing/sultana-name.webp', width: 1200, height: 260 },
]

/*
 * Three of the run's posts, not four.
 *
 * `sultana-post-hero.webp` is out, and it is worth saying why rather than
 * quietly shortening the list. The image model baked a line of mirrored
 * gibberish into the photograph itself — it reads "Dnoit Ennrer" across the top
 * of the wall — so it is not a composition we can crop out of. It was the first
 * post on this page, which meant the loudest evidence of the product's quality
 * was a picture of the product failing.
 *
 * The underlying defect is in the social pipeline, not here: nothing checks a
 * generated image for garbage lettering before it ships to a customer. Dropping
 * the file from the marketing page does not fix that, and a replacement cannot
 * be hand-made, because `PRODUCT.md` requires every file on this page to be
 * output a customer would download.
 */
const SULTANA_POSTS = [
  '/marketing/sultana-post-feature.webp',
  '/marketing/sultana-post-detail.webp',
  '/marketing/sultana-post-palette.webp',
]

/*
 * Neither run recorded a `text` colour we can point at, so the darkest member
 * of each palette is handed to `brandTheme` as the ink and checked against the
 * paper there like everything else — 11.8:1 for Sultana's teal on its cream,
 * 6.91:1 for Makān's brown on its. A specimen whose ink failed would fall back
 * to plain black or white rather than render an unreadable plate.
 */
const SULTANA: SpecimenSource = {
  id: 'sultana',
  name: 'Sultana',
  palette: {
    primary: '#1B3A3A',
    secondary: '#D4A853',
    accent: '#F43F5E',
    background: '#FEFAF5',
    text: '#1B3A3A',
  },
  swatches: ['#1B3A3A', '#D4A853', '#F43F5E', '#FEFAF5'],
  fonts: { heading: 'Reem Kufi Ink', body: 'El Messiri' },
  /* The wordmark, not `sultana-icon.webp`: the icon export is trimmed too close
     and clips its own lettering at the frame edge. */
  mark: SULTANA_LOGOS[0],
  logos: SULTANA_LOGOS,
  posts: SULTANA_POSTS,
  values: [],
  pdf: '/marketing/sultana-brand-kit.pdf',
}

/*
 * Makān, from the run `PRODUCT.md` records: a coffee brand generated end to end.
 *
 * It carries no mark and no posts here on purpose. Its four logo concepts are
 * real and sit in R2 with the rest of that run, but nothing has exported them
 * to `public/`, and drawing a stand-in would break the one rule this page
 * cannot break. What it does have is its palette, its type pairing and the four
 * values the run wrote, which is enough for the plate to repaint completely and
 * for the drawer to open onto something real.
 */
const MAKAN: SpecimenSource = {
  id: 'makan',
  name: 'Makān',
  palette: {
    primary: '#6F4E37',
    secondary: '#D4A574',
    accent: '#C08552',
    background: '#FAF6F0',
    text: '#6F4E37',
  },
  swatches: ['#6F4E37', '#D4A574', '#C08552', '#FAF6F0'],
  fonts: { heading: 'Sora', body: 'Inter' },
  logos: [],
  posts: [],
  values: ['Intentional Restraint', 'Sensory Clarity', 'Modern Heritage', 'Quiet Confidence'],
}

/** Order matters: the first is the plate's default and the cabinet's open drawer. */
export const SPECIMENS = [SULTANA, MAKAN]
