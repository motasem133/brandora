import { readFileSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'

/*
 * Draws `public/og.png`, the share card for the marketing pages.
 *
 * A script that is run rather than a route that renders. `next/og` would
 * compose this per request, but it needs font binaries at runtime and the whole
 * type system here comes from `next/font/google`, which has no files to hand it
 * — so a runtime card would either ship a second copy of two families or draw
 * the product's own typography in a substitute face. Rendered once, committed,
 * and served as a static file, it is also one fewer thing that can fail while a
 * crawler is looking.
 *
 * One card for both languages, deliberately. The alternative is a card per
 * locale with the tagline set in each, which puts Arabic type through the same
 * substitution problem in the place it would be most obvious.
 *
 * Usage: pnpm og:card
 */

const W = 1200
const H = 630

/* Room Black, Signal Violet, Indigo Core, Horizon Blue, Lit Violet, Reading
   Grey — DESIGN.md's names, so a palette change is greppable from here. */
const ROOM_BLACK = '#05070f'
const SIGNAL_VIOLET = '#7240ff'
const INDIGO_CORE = '#5b5cfb'
const HORIZON_BLUE = '#3b82f6'
const LIT_VIOLET = '#aa8cff'
const READING_GREY = '#a3aec9'

/*
 * The horizon, drawn rather than described.
 *
 * The landing page opens on a dark room with a single lit arc across it; this
 * is that image at card scale. The gradient runs violet → indigo → blue along
 * the ramp the brand commits to, and the bloom above it is the same light
 * spilling upward, which is why both stops are the ramp's own colours rather
 * than white.
 */
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="ramp" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${SIGNAL_VIOLET}"/>
      <stop offset="50%" stop-color="${INDIGO_CORE}"/>
      <stop offset="100%" stop-color="${HORIZON_BLUE}"/>
    </linearGradient>
    <radialGradient id="bloom" cx="0.5" cy="1" r="0.75">
      <stop offset="0%" stop-color="${INDIGO_CORE}" stop-opacity="0.45"/>
      <stop offset="55%" stop-color="${SIGNAL_VIOLET}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="${ROOM_BLACK}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="${ROOM_BLACK}"/>
  <rect width="${W}" height="${H}" fill="url(#bloom)"/>

  <!-- The mark: a four-point star with a smaller one cut out of its centre.
       Pinned in PRODUCT.md, so it is drawn here rather than approximated. -->
  <g transform="translate(96, 92)">
    <path d="M36 0 L45.5 26.5 L72 36 L45.5 45.5 L36 72 L26.5 45.5 L0 36 L26.5 26.5 Z"
          fill="url(#ramp)"/>
    <path d="M36 22 L40 32 L50 36 L40 40 L36 50 L32 40 L22 36 L32 32 Z"
          fill="${ROOM_BLACK}"/>
  </g>

  <text x="188" y="146" font-family="Verdana, DejaVu Sans, sans-serif"
        font-size="44" font-weight="700" fill="#ffffff" letter-spacing="-1">Brandora</text>

  <text x="96" y="330" font-family="Verdana, DejaVu Sans, sans-serif"
        font-size="76" font-weight="700" fill="#ffffff" letter-spacing="-2.5">One brief.</text>
  <text x="96" y="424" font-family="Verdana, DejaVu Sans, sans-serif"
        font-size="76" font-weight="700" fill="${LIT_VIOLET}" letter-spacing="-2.5">Your entire brand.</text>

  <text x="96" y="492" font-family="Verdana, DejaVu Sans, sans-serif"
        font-size="27" fill="${READING_GREY}">Names, logos, palette, type, a website and a social kit — generated together.</text>

  <!-- The lit horizon the room is named for. -->
  <rect x="0" y="592" width="${W}" height="3" fill="url(#ramp)"/>
</svg>`

/* Wrapped rather than top-level await: the other scripts here run under tsx's
   CJS output, which has no top-level await. */
async function main() {
  const png = await sharp(Buffer.from(svg)).png().toBuffer()
  writeFileSync('public/og.png', png)

  const { width, height } = await sharp(readFileSync('public/og.png')).metadata()
  console.info(`public/og.png — ${width}×${height}, ${(png.length / 1024).toFixed(1)}KB`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
