import type { CSSProperties } from 'react'

/**
 * Turning a generated palette into a surface the app can safely hand itself to.
 *
 * The product's promise is a coherent brand, and the screens that show one were
 * painted entirely in Brandora's own purple — the customer's colours appeared as
 * five small chips near the bottom of a scroll. These screens wear the brand
 * instead. That is only safe because a generated palette is not a designed one:
 * it can pair near-black text with a near-black ground, or hand back a primary
 * nobody can read a label on. Every colour that ends up under text here is
 * checked against it and replaced when it fails, so a bad generation degrades
 * to something plain rather than to something unreadable.
 */

export type BrandPalette = {
  primary: string
  secondary: string
  accent: string
  background: string
  text: string
} | null

export type BrandFonts = {
  heading: string
  body: string
  accent?: string
} | null

/** WCAG's contrast floors, named so the call sites read as intent. */
const BODY_MIN = 4.5
const LARGE_MIN = 3

function parseHex(value: string | undefined | null): [number, number, number] | null {
  if (!value) return null

  const hex = value.trim().replace(/^#/, '')
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((char) => char + char)
          .join('')
      : hex

  if (!/^[0-9a-f]{6}$/i.test(full)) return null

  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ]
}

/** Relative luminance, per WCAG 2.1 — the sRGB curve, not a naive average. */
function luminance(rgb: [number, number, number]) {
  const [r, g, b] = rgb.map((channel) => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a: string, b: string) {
  const first = parseHex(a)
  const second = parseHex(b)
  if (!first || !second) return 1

  const light = Math.max(luminance(first), luminance(second))
  const dark = Math.min(luminance(first), luminance(second))

  return (light + 0.05) / (dark + 0.05)
}

/**
 * The most readable of the candidates on `ground`, falling back to plain black
 * or white — one of which always clears 4.5:1 on any colour whatsoever.
 */
function readableOn(ground: string, candidates: (string | undefined)[], min = BODY_MIN) {
  for (const candidate of candidates) {
    if (candidate && parseHex(candidate) && contrast(candidate, ground) >= min) return candidate
  }

  return contrast('#ffffff', ground) >= contrast('#000000', ground) ? '#ffffff' : '#000000'
}

function toHex([r, g, b]: [number, number, number]) {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`
}

/**
 * Ink softened toward its paper, but only as far as it can go and still be read.
 *
 * This used to be a flat `color-mix(... 42%, paper)`. Mixing 42% of anything
 * into its own background is capped near 2.5:1 — it cannot reach 4.5:1 for any
 * ink and paper in existence, including pure black on pure white — and it was
 * carrying the identity plate's meta line and the type specimen's labels, which
 * measured 2.46:1 on a real brand.
 *
 * So the ratio is found rather than assumed: start at the softest step, walk
 * back toward full ink, and stop at the first mix that clears the floor. Every
 * other colour in this file is contrast-checked; this one now is too.
 */
function softened(ink: string, paper: string, min: number) {
  const inkRgb = parseHex(ink)
  const paperRgb = parseHex(paper)
  if (!inkRgb || !paperRgb) return ink

  for (let strength = 0.4; strength <= 1; strength += 0.05) {
    const mixed = toHex([
      inkRgb[0] * strength + paperRgb[0] * (1 - strength),
      inkRgb[1] * strength + paperRgb[1] * (1 - strength),
      inkRgb[2] * strength + paperRgb[2] * (1 - strength),
    ] as [number, number, number])

    if (contrast(mixed, paper) >= min) return mixed
  }

  return ink
}

export type BrandTheme = {
  /** The brand's own ground — what its mark is drawn to sit on. */
  paper: string
  /** Text on that ground, guaranteed readable. */
  ink: string
  primary: string
  /** Text on the primary, for anything filled with it. */
  onPrimary: string
  secondary: string
  /** True when the brand's ground is dark, for callers choosing an asset. */
  isDark: boolean
  /** Spread onto a wrapper; everything below reads these. */
  vars: CSSProperties
}

const FALLBACK: NonNullable<BrandPalette> = {
  primary: '#7c3aed',
  secondary: '#3b82f6',
  accent: '#4f46e5',
  background: '#ffffff',
  text: '#0b1020',
}

/**
 * Reads as a plain object so a server component can spread `theme.vars` onto a
 * wrapper and every child — client or server — inherits the brand through CSS
 * rather than through props threaded down the tree.
 */
export function brandTheme(palette: BrandPalette): BrandTheme {
  const source = palette ?? FALLBACK

  // A logo is drawn on its brand's ground; if that ground is unusable we would
  // rather show the mark on plain white than on a colour that eats it.
  const paper = parseHex(source.background) ? source.background : '#ffffff'
  const ink = readableOn(paper, [source.text, source.accent])

  const primary = parseHex(source.primary) ? source.primary : FALLBACK.primary
  const secondary = parseHex(source.secondary) ? source.secondary : FALLBACK.secondary

  /*
   * The brand's primary is only allowed to carry text on the brand's own ground
   * when it can be read there; otherwise headings fall back to the ink. This is
   * the check that stops a pale-yellow primary from rendering a heading
   * invisible on white.
   */
  const accentOnPaper = contrast(primary, paper) >= LARGE_MIN ? primary : ink

  const isDark = contrast('#ffffff', paper) > contrast('#000000', paper)

  return {
    paper,
    ink,
    primary,
    onPrimary: readableOn(primary, []),
    secondary,
    isDark,
    vars: {
      '--brand-paper': paper,
      '--brand-ink': ink,
      '--brand-accent': accentOnPaper,
      '--brand-primary': primary,
      '--brand-on-primary': readableOn(primary, []),
      '--brand-secondary': secondary,
      /*
       * Secondary text and hairlines are mixed from the ink rather than set to
       * a grey. Grey on a coloured ground reads as dirt; the same hue at lower
       * strength reads as quiet.
       *
       * Both text tones are resolved to a checked value rather than left as a
       * `color-mix` the browser evaluates and nothing verifies. `soft` and
       * `faint` differ in intent, not in legibility: one is quieter, neither is
       * allowed to be unreadable, so both clear 4.5:1 against this paper.
       */
      '--brand-ink-soft': softened(ink, paper, BODY_MIN),
      '--brand-ink-faint': softened(ink, paper, BODY_MIN),
      /* Not text — a hairline — so this one stays a mix and stays faint. */
      '--brand-line': `color-mix(in srgb, ${ink} 14%, transparent)`,
    } as CSSProperties,
  }
}

/**
 * A generated font name is a Google Fonts family the visitor may not have.
 * Rendering a specimen in it when they do and in the app's own face when they
 * do not is the honest behaviour — the family name is printed beside it either
 * way, which is the thing they actually need.
 */
export function fontStack(family: string | undefined | null) {
  return family ? `"${family}", var(--font-sans)` : 'var(--font-sans)'
}
