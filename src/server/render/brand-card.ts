import 'server-only'

import { renderToPng } from './browser'
import { fontFace, loadFont } from './post-template'

/**
 * A brand's own share card — the image a link to their published site renders
 * with in WhatsApp, Slack, LinkedIn or iMessage.
 *
 * What this replaced was nine lines of Jimp: a rectangle filled with the
 * background colour and the logo composited dead centre. It was wired up
 * correctly and served on every published site, and it showed none of what the
 * product had just generated — no name, no slogan, no palette, no typeface. A
 * customer sharing their new brand got a logo floating on a coloured field.
 *
 * Everything here comes from the brand's own record. The type is the family the
 * model chose for them, fetched and inlined; the colours are their palette; the
 * mark is their logo. Nothing on the card is Brandora's — this is the
 * customer's card on the customer's domain, and a maker's mark on it would be
 * us advertising through their business.
 */

const W = 1200
const H = 630

export type CardBrand = {
  name: string
  slogan: string | null
  palette: {
    primary: string
    secondary: string
    accent: string
    background: string
    text: string
  } | null
  fonts: { heading: string; body: string } | null
}

/*
 * Defaults for a brand whose run only half-finished.
 *
 * A card still has to be produced — it is stored against the project and served
 * by the site whether or not the palette landed — so every read below falls
 * back rather than throwing. Black on white is the one pair that cannot be
 * wrong.
 */
const FALLBACK = {
  background: '#ffffff',
  text: '#101014',
  primary: '#101014',
  secondary: '#101014',
  accent: '#101014',
}

const SYSTEM_STACK = 'ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif'

function escape(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * How much ink a colour has against the card's ground.
 *
 * Used only to decide whether the hairline and the swatch outlines are drawn in
 * white or black — a palette on a near-black ground needs its edges lifted, one
 * on cream needs them darkened. WCAG's own relative luminance, because the
 * palette was already generated against that rule and a second, looser
 * definition here would disagree with it on exactly the borderline cases.
 */
function luminance(hex: string): number {
  const value = hex.replace('#', '')
  if (value.length !== 6) return 1

  const channel = (pair: string) => {
    const c = parseInt(pair, 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }

  return (
    0.2126 * channel(value.slice(0, 2)) +
    0.7152 * channel(value.slice(2, 4)) +
    0.0722 * channel(value.slice(4, 6))
  )
}

export async function renderBrandCard(brand: CardBrand, logo: Buffer): Promise<Buffer> {
  const palette = { ...FALLBACK, ...(brand.palette ?? {}) }
  const dark = luminance(palette.background) < 0.5

  /*
   * Both faces, in parallel, and neither is required.
   *
   * `loadFont` answers null rather than throwing for a family that is not on
   * Google Fonts — the model does occasionally name one that is not — and the
   * card then sets that role in the system stack. A card in the wrong face is a
   * far better outcome than a project with no card.
   */
  const [heading, body] = await Promise.all([
    brand.fonts?.heading ? loadFont(brand.fonts.heading) : null,
    brand.fonts?.body ? loadFont(brand.fonts.body) : null,
  ])

  const faces = [
    heading && brand.fonts?.heading ? fontFace(brand.fonts.heading, heading) : '',
    body && brand.fonts?.body ? fontFace(brand.fonts.body, body) : '',
  ].join('')

  const headingStack = heading && brand.fonts?.heading
    ? `'${brand.fonts.heading.replace(/'/g, '')}', ${SYSTEM_STACK}`
    : SYSTEM_STACK

  const bodyStack = body && brand.fonts?.body
    ? `'${brand.fonts.body.replace(/'/g, '')}', ${SYSTEM_STACK}`
    : SYSTEM_STACK

  /*
   * The name, sized to its own length.
   *
   * One fixed size cannot hold both "Koi" and "AliAkber Weds Mubaraka" — the
   * short one looks lost and the long one wraps into the slogan. Three steps
   * rather than a continuous fit because the alternative is measuring text in
   * the browser and re-rendering, and the difference between the two is not
   * visible at this size.
   */
  const nameSize = brand.name.length > 26 ? 54 : brand.name.length > 16 ? 66 : 82

  const logoSrc = `data:image/png;base64,${logo.toString('base64')}`
  const edge = dark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)'

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  ${faces}

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    width: ${W}px;
    height: ${H}px;
    background: ${palette.background};
    color: ${palette.text};
    overflow: hidden;
    position: relative;
    -webkit-font-smoothing: antialiased;
  }

  /*
   * A wash of the brand's own primary, low and wide. It keeps a card whose
   * palette is a single flat colour from reading as a blank rectangle, and
   * because it is drawn from the palette rather than added to it, it cannot
   * introduce a hue the brand does not own.
   */
  .wash {
    position: absolute;
    left: -10%;
    bottom: -55%;
    width: 120%;
    height: 100%;
    background: radial-gradient(50% 50% at 50% 50%,
      ${palette.primary} 0%, transparent 70%);
    opacity: ${dark ? 0.32 : 0.14};
  }

  .pad {
    position: relative;
    height: 100%;
    padding: 76px 88px;
    display: flex;
    flex-direction: column;
  }

  /* Contained, never cropped — a lockup cut off at the edge is worse than a
     small one, and logos arrive at wildly different aspect ratios. */
  .logo {
    max-width: 430px;
    max-height: 150px;
    width: auto;
    height: auto;
    object-fit: contain;
    object-position: left center;
    display: block;
  }

  .spacer { flex: 1; }

  .name {
    font-family: ${headingStack};
    font-size: ${nameSize}px;
    font-weight: 700;
    line-height: 1.04;
    letter-spacing: -0.02em;
    color: ${palette.text};
  }

  .slogan {
    font-family: ${bodyStack};
    font-size: 26px;
    font-weight: 400;
    line-height: 1.4;
    margin-top: 18px;
    max-width: 780px;
    opacity: 0.72;
  }

  .rule {
    height: 1px;
    background: ${edge};
    margin: 40px 0 24px;
  }

  .swatches { display: flex; gap: 12px; }

  .swatch {
    width: 54px;
    height: 54px;
    border-radius: 10px;
    box-shadow: inset 0 0 0 1px ${edge};
  }
</style>
</head>
<body>
  <div class="wash"></div>
  <div class="pad">
    <img class="logo" src="${logoSrc}" alt="">
    <div class="spacer"></div>
    <div class="name">${escape(brand.name)}</div>
    ${brand.slogan ? `<div class="slogan">${escape(brand.slogan)}</div>` : ''}
    ${
      /* Only when there is a palette to show. The fallback colours are all one
         near-black, so a brand whose run did not produce a palette would
         otherwise get a row of four identical squares presented as its colour
         scheme — worse than showing nothing. */
      brand.palette
        ? `<div class="rule"></div>
    <div class="swatches">
      <span class="swatch" style="background:${palette.primary}"></span>
      <span class="swatch" style="background:${palette.secondary}"></span>
      <span class="swatch" style="background:${palette.accent}"></span>
      <span class="swatch" style="background:${palette.text}"></span>
    </div>`
        : ''
    }
  </div>
</body>
</html>`

  return Buffer.from(await renderToPng(html, { width: W, height: H }))
}
