import { readFileSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright-core'

/*
 * Draws `public/og.png`, the share card every Brandora link renders with.
 *
 * Rendered in a browser rather than through `sharp`, and that is the whole
 * change. The previous version composed an SVG and let librsvg rasterise it,
 * which resolves type through fontconfig — so the card advertising a branding
 * product was set in Verdana, because Bricolage Grotesque is not a system font
 * anywhere. The note it carried was honest about the constraint and treated it
 * as unavoidable; it is not. Chromium loads a webfont like any other page, and
 * this repo already renders HTML to PNG this way for the brand kit.
 *
 * Two things are therefore true that were not before: the headline is set in
 * the product's own display face, and the mark is the supplied artwork placed
 * directly rather than a path traced from it. The old file drew a straight-
 * edged diamond star with a filled centre, which is not the mark — the artwork
 * has concave sparkle edges and its centre is cut out.
 *
 * One card for both languages, deliberately. A card per locale would put
 * Arabic through a second font load for one line of type, in the place where a
 * substitution would be most obvious.
 *
 * Needs the Playwright browser (`npx playwright install chromium`) and network,
 * because the faces come from Google Fonts. Both are fine: this runs by hand
 * and commits its output.
 *
 * Usage: pnpm og:card
 */

const W = 1200
const H = 630

/* DESIGN.md's names, so a palette change is greppable from here. */
const ROOM_BLACK = '#05070f'
const SIGNAL_VIOLET = '#7240ff'
const INDIGO_CORE = '#5b5cfb'
const HORIZON_BLUE = '#3b82f6'
const BLOOM_VIOLET = '#8f66ff'
const LIT_VIOLET = '#aa8cff'
const READING_GREY = '#a3aec9'

/* Inlined rather than linked: a file:// page cannot load a relative asset, and
   a data URI removes the only other thing that could fail mid-render. */
const mark = `data:image/png;base64,${readFileSync('public/brandora-mark.png').toString('base64')}`

const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=IBM+Plex+Mono:wght@500&display=swap">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    width: ${W}px;
    height: ${H}px;
    background: ${ROOM_BLACK};
    overflow: hidden;
    position: relative;
    -webkit-font-smoothing: antialiased;
  }

  /*
   * The arc: the single light source below the interface that the whole design
   * system is built on, at card scale.
   *
   * Wide and shallow rather than round. The first attempt used a circle roughly
   * the width of the card, which does not read as a horizon at all — it reads
   * as a dome enclosing the type, and it put the mark on top of the apex like
   * an ornament. The ellipse here is more than twice the card's width, so only
   * its shallow crown is visible: 520px at the centre falling to 605px at both
   * edges. That is a horizon the content sits above, which is the arrangement
   * the landing page uses.
   *
   * A ring, not a band — the inner radial holds the centre at Room Black so
   * only the rim lights, and the lit sector runs the brand ramp violet ->
   * indigo -> blue before falling to nothing well before it reaches the edges.
   *
   * The sweep is mirrored around the crown rather than running one way from it.
   * A single clockwise sweep lights one shoulder and leaves the other dark,
   * which on a symmetrical composition reads as a mistake rather than as a
   * direction — so the stops run out to both sides from Bloom Violet at 0deg.
   *
   * The 0deg start matters and is easy to get wrong. A conic gradient's own
   * zero sits at twelve o'clock, so starting it at 270deg — which the first
   * version carried over — rotates it to nine o'clock and puts the bright stops
   * on the left shoulder while the right fades out. Only the ellipse's crown is on the
   * card, roughly 42 degrees either side of the apex, so every stop below is
   * inside that window.
   */
  .arc {
    position: absolute;
    left: 50%;
    top: 520px;
    width: 2600px;
    height: 1500px;
    transform: translateX(-50%);
    border-radius: 50%;
    background:
      radial-gradient(closest-side, ${ROOM_BLACK} 0%, ${ROOM_BLACK} 98.4%, rgba(5,7,15,0) 99%),
      conic-gradient(from 0deg at 50% 50%,
        ${BLOOM_VIOLET} 0deg, ${SIGNAL_VIOLET} 14deg, ${INDIGO_CORE} 32deg,
        ${HORIZON_BLUE} 54deg, rgba(5,7,15,0) 78deg,
        rgba(5,7,15,0) 282deg, ${HORIZON_BLUE} 306deg,
        ${INDIGO_CORE} 328deg, ${SIGNAL_VIOLET} 346deg, ${BLOOM_VIOLET} 360deg);
  }

  /*
   * The light spilling up off it. Separate from the arc rather than a
   * drop-shadow on it: a shadow follows the ellipse all the way round, and what
   * this needs is a glow that rises from the crown and is gone by mid-card.
   */
  .bloom {
    position: absolute;
    left: 50%;
    bottom: -190px;
    width: 1500px;
    height: 600px;
    transform: translateX(-50%);
    background: radial-gradient(50% 50% at 50% 50%,
      rgba(114, 64, 255, 0.46) 0%,
      rgba(91, 92, 251, 0.17) 44%,
      rgba(5, 7, 15, 0) 74%);
  }

  .pad {
    position: relative;
    height: 100%;
    padding: 84px 96px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  /* Mark and wordmark as one lockup, the arrangement every header uses. */
  .lockup {
    display: flex;
    align-items: center;
    gap: 18px;
  }

  /* 60px, which is what the lockup can carry without the mark overpowering a
     32px wordmark set beside it. */
  .mark {
    width: 60px;
    height: 60px;
    display: block;
  }

  .wordmark {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-size: 32px;
    font-weight: 800;
    letter-spacing: -0.025em;
    color: #fff;
    line-height: 1;
  }

  .headline {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-size: 90px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.04em;
    color: #fff;
    margin-top: 72px;
  }

  .headline .accent { color: ${LIT_VIOLET}; }

  /*
   * The feature list, set as a mono rule rather than a sentence. It is the one
   * place the card says what is actually generated, and at 18px it survives the
   * LinkedIn-sized render while staying quiet enough not to compete with the
   * headline above it.
   */
  .sub {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 18px;
    font-weight: 500;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: ${READING_GREY};
    line-height: 1;
    margin-top: 36px;
  }
</style>
</head>
<body>
  <div class="bloom"></div>
  <div class="arc"></div>
  <div class="pad">
    <div class="lockup">
      <img class="mark" src="${mark}" alt="">
      <span class="wordmark">Brandora</span>
    </div>
    <div class="headline">Your entire brand,<br><span class="accent">from one brief.</span></div>
    <div class="sub">Names &middot; Logos &middot; Palette &middot; Type &middot; Website &middot; Social</div>
  </div>
</body>
</html>`

async function main() {
  const browser = await chromium.launch({ headless: true })

  try {
    const page = await browser.newPage({
      viewport: { width: W, height: H },
      deviceScaleFactor: 1,
    })

    await page.setContent(html, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)

    /*
     * The check this script exists to satisfy.
     *
     * A missing webfont does not fail — it falls back, silently, and produces a
     * card that looks fine until someone notices the type is wrong. That is
     * precisely the defect being fixed here, so it is worth failing on rather
     * than shipping again.
     */
    const loaded = await page.evaluate(() => ({
      display: document.fonts.check('800 78px "Bricolage Grotesque"'),
      mono: document.fonts.check('500 15px "IBM Plex Mono"'),
    }))

    if (!loaded.display || !loaded.mono) {
      throw new Error(
        `Webfonts did not load (Bricolage ${loaded.display}, Plex Mono ${loaded.mono}) — ` +
          'the card would fall back to a system face. Check the network and re-run.',
      )
    }

    const png = await page.screenshot({ type: 'png' })
    writeFileSync('public/og.png', png)

    console.info(`public/og.png — ${W}×${H}, ${(png.length / 1024).toFixed(1)}KB`)
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
