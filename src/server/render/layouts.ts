import 'server-only'

import { contrast } from '@/lib/brand-theme'
import { deviceFor, registerFor, SHAPE_DEVICES, splitHeadline, type PostBrand } from './post-template'

/**
 * The layouts a kit is made of.
 *
 * Taken from the anatomy of the reference deck rather than invented: every post
 * in it is the same five parts rearranged — a logo chip in a fixed corner, one
 * repeated shape gesture, a two-tone headline, a photograph, and a field of the
 * brand's own colour. What changes between posts is which part leads.
 *
 * They share a shell for that reason. A kit where each layout is its own
 * private design is a folder of unrelated pictures; the repetition is the
 * brand.
 */

export type LayoutKind =
  | 'hero' | 'feature' | 'statement' | 'detail' | 'story'
  | 'about' | 'palette' | 'identity'

export const LAYOUTS: Record<LayoutKind, { label: string; needs: 'hero' | 'people' | 'detail' | null; size: { width: number; height: number } }> = {
  hero: { label: 'Opening post', needs: 'hero', size: { width: 1080, height: 1080 } },
  feature: { label: 'Who we are', needs: 'people', size: { width: 1080, height: 1080 } },
  statement: { label: 'Statement', needs: null, size: { width: 1080, height: 1080 } },
  detail: { label: 'Close up', needs: 'detail', size: { width: 1080, height: 1080 } },
  story: { label: 'Story', needs: 'hero', size: { width: 1080, height: 1920 } },
  about: { label: 'Our story', needs: 'detail', size: { width: 1080, height: 1080 } },
  palette: { label: 'Colours & type', needs: null, size: { width: 1080, height: 1080 } },
  identity: { label: 'The mark', needs: null, size: { width: 1080, height: 1080 } },
}

const hasArabic = (value: string) => /[؀-ۿ]/.test(value)

function escape(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

type Parts = {
  brand: PostBrand
  wordmark: string
  mark: string
  photo: string | null
  faces: string
  width: number
  height: number
  /** What this particular post says. Falls back to the slogan when absent. */
  copy?: { lead: string; tail: string | null; body?: string }
}

/** Scales the 1080-wide design to whatever canvas is asked for. */
const scaler = (width: number) => (n: number) => Math.round((n / 1080) * width)

/** The logo, on its own plate, in the corner it always occupies. */
/**
 * The mark, set on the picture rather than on a plate.
 *
 * The plate was a white rounded rectangle behind the logo, and it read as a
 * sticker pasted onto the photograph — the single most template-looking element
 * in the kit. It existed for a real reason: a dark mark on a dark picture
 * disappears. The reason is answered here by the scrim the photographic layouts
 * already draw, and by using the reversed lockup on it, which is a file the kit
 * produces anyway.
 *
 * On a light ground the lockup stands in its own colour with nothing behind it.
 */
function lockup(p: Parts, u: (n: number) => number, rtl: boolean, ground: string) {
  const place = `position:absolute;top:${u(70)}px;${rtl ? `right:${u(88)}px` : `left:${u(88)}px`}`

  /*
   * Reversed or not is read off the ground rather than passed in by the caller.
   *
   * It was a boolean each layout set by hand, and it was wrong the moment a
   * register changed a field's colour underneath it: a white lockup on a brand
   * whose second colour is near-white is an invisible logo, which is what four
   * brands rendered side by side showed immediately. The ground is the only
   * thing that knows.
   */
  const invert = contrast('#ffffff', ground) >= contrast('#000000', ground)
  return `<div style="display:flex;${place};align-items:center">
      <img src="${p.wordmark}" width="${u(210)}" height="${u(80)}"
        style="object-fit:contain${invert ? ';filter:brightness(0) invert(1)' : ''}"/></div>`
}

/**
 * A field of colour with a straight edge, which is what the wave replaces.
 *
 * The band was a silhouette stretched across the canvas: fixed at 1080 it read
 * as a wave, and a wave under every headline in a kit is a decoration doing the
 * work that composition should. A rectangle anchored to an edge, with a real
 * margin and one accent bar, is the same structural job — the headline still
 * lands on light, which the COLR heading face requires — without a gesture
 * asking to be noticed.
 */
function field(
  p: Parts,
  u: (n: number) => number,
  box: { top: number; height: number },
  fill: string,
  r = registerFor(p.brand.style, p.brand.industry),
) {
  const radius = r.radius ? `;border-radius:${u(r.radius)}px ${u(r.radius)}px 0 0` : ''

  /*
   * An organic register keeps the brand's own curve, as the edge of the field
   * rather than as a silhouette floating on the picture. The paths are bands —
   * they touch both sides and shape only what lies between — so stretched to
   * the canvas they read as a cut, which is what they were drawn for.
   */
  const cut =
    r.edge === 'curve'
      ? `<svg width="${p.width}" height="${u(120)}" viewBox="0 0 100 100" preserveAspectRatio="none"
          style="position:absolute;left:0;top:${u(box.top - 118)}px">
          <path d="${SHAPE_DEVICES[deviceFor(p.brand.style, p.brand.industry)]}" fill="${fill}"/></svg>`
      : ''

  return `${cut}<div style="display:flex;position:absolute;left:0;top:${u(box.top)}px;
      width:${p.width}px;height:${u(box.height)}px;background:${fill}${radius}"></div>`
}



/** A photograph, filling its box, with the focal point kept off the edges. */
/** The accent, as a bar with a length rather than a rule with a colour. */
function bar(p: Parts, u: (n: number) => number, colour: string, width = 96) {
  return `<div style="display:flex;width:${u(width)}px;height:${u(8)}px;background:${colour}"></div>`
}

/** A hex to the 0-1 channel values an SVG transfer function wants. */
function channels(hex: string): [number, number, number] | null {
  const value = hex.trim().replace(/^#/, '')
  const full = value.length === 3 ? value.split('').map((ch) => ch + ch).join('') : value
  if (!/^[0-9a-f]{6}$/i.test(full)) return null
  return [
    parseInt(full.slice(0, 2), 16) / 255,
    parseInt(full.slice(2, 4), 16) / 255,
    parseInt(full.slice(4, 6), 16) / 255,
  ]
}

/**
 * The brand's own two colours mapped onto a photograph.
 *
 * Generated photography is the part of a kit that looks bought rather than
 * made: three frames from a model that has never heard of this brand, dropped
 * into a layout that has. A duotone is the cheapest honest answer — the picture
 * keeps its composition and its light, and every tone in it lands between two
 * colours the brand already owns.
 *
 * A transfer function rather than blend modes stacked over the image: two
 * tables map luminance straight onto the ramp, which is one filter and no
 * layers to get out of order.
 *
 * It refuses rather than degrades. A shadow colour that is not clearly darker
 * than its highlight produces a negative, and a generated palette will hand
 * over exactly that pairing — so a brand whose primary is pale keeps its
 * photograph untouched instead of inverted.
 */
function duotone(id: string, shadow: string, highlight: string, strength = 1) {
  const dark = channels(shadow)
  const light = channels(highlight)
  if (!dark || !light) return null

  const luma = (ch: [number, number, number]) => 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
  if (luma(dark) >= luma(light) - 0.25) return null

  const table = (i: number) => `${dark[i].toFixed(3)} ${light[i].toFixed(3)}`
  return `<svg width="0" height="0" style="position:absolute"><defs>
      <filter id="${id}" color-interpolation-filters="sRGB">
        <feColorMatrix type="matrix" values=".2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 0 0 0 1 0"/>
        <feComponentTransfer result="duo">
          <feFuncR type="table" tableValues="${table(0)}"/>
          <feFuncG type="table" tableValues="${table(1)}"/>
          <feFuncB type="table" tableValues="${table(2)}"/>
        </feComponentTransfer>
        ${strength < 1
          ? `<feComposite in="duo" in2="SourceGraphic" operator="arithmetic" k2="${strength}" k3="${(1 - strength).toFixed(2)}"/>`
          : ''}
      </filter></defs></svg>`
}

/** A photograph, filling its box, treated as the brand's register asks. */
function photo(
  src: string,
  u: (n: number) => number,
  box: { top: number; height: number },
  width: number,
  treatment?: { mode: 'plain' | 'duotone' | 'tint'; shadow: string; highlight: string },
) {
  const filter =
    treatment && treatment.mode !== 'plain'
      ? duotone('duo', treatment.shadow, treatment.highlight, treatment.mode === 'tint' ? 0.6 : 1)
      : null

  return `${filter ?? ''}<div style="display:flex;position:absolute;top:${u(box.top)}px;left:0;width:${width}px;
      height:${u(box.height)}px;overflow:hidden">
      <img src="${src}" width="${width}" height="${u(box.height)}"
        style="object-fit:cover${filter ? ';filter:url(#duo)' : ''}"/></div>`
}


/**
 * The size a line can be set at and still fit its block.
 *
 * The kit's copy is generated, so its length is not a design decision anybody
 * made: one brand's statement is four words and another's is a sentence about
 * jasmine and stone fruit. Set at one size the long ones overflowed their field
 * and were cut off mid-word — which four brands rendered side by side showed at
 * once, and a single brand never would.
 *
 * A ceiling rather than a fit: it steps the size down as the line grows and
 * stops, because type that shrinks without limit is a different failure.
 */
function fitted(size: number, text: string, limit = 46) {
  if (text.length <= limit) return size
  const shrink = Math.min(0.34, (text.length - limit) / 200)
  return Math.round(size * (1 - shrink))
}

function headline(p: Parts, u: (n: number) => number, opts: {
  size: number
  lead: string
  tail: string | null
  colour: string
  tailColour: string
  align: 'center' | 'start'
  rtl: boolean
}) {
  const items = opts.align === 'center' ? 'center' : opts.rtl ? 'flex-end' : 'flex-start'
  return `<div style="display:flex;flex-direction:column;align-items:${items};width:100%">
      <div style="display:flex;font-family:'${p.brand.fonts.heading}';font-size:${u(opts.size)}px;
        line-height:1.18;color:${opts.colour};text-align:${opts.align === 'center' ? 'center' : 'start'};
        ${opts.rtl ? 'direction:rtl' : ''}">${escape(opts.lead)}</div>
      ${opts.tail ? `<div style="display:flex;font-size:${u(opts.size * 0.36)}px;line-height:1.35;
        margin-top:${u(20)}px;color:${opts.tailColour};text-align:${opts.align === 'center' ? 'center' : 'start'}"
        >${escape(opts.tail)}</div>` : ''}</div>`
}

export function renderLayout(kind: LayoutKind, p: Parts) {
  const u = scaler(p.width)
  const c = p.brand.palette
  const fallback = splitHeadline(p.brand.slogan?.trim() || p.brand.name)
  const lead = p.copy?.lead ?? fallback.lead
  /*
   * An explicit null tail means "this post has no subtitle" and must not fall
   * back to the slogan's second half — otherwise every post in the kit carries
   * "The Kitchen of the Matriarch" under its own line, which is the repetition
   * the per-post copy exists to remove.
   */
  const tail = p.copy ? p.copy.tail : fallback.tail
  const rtl = hasArabic(lead)
  /* How this brand is set — margin, ranging, scale, corners, how much colour
     runs as field. Same layouts, different bearing per brand. */
  const r = registerFor(p.brand.style, p.brand.industry)
  const m = u(r.margin)
  const ranged = r.align === 'center' ? 'center' : rtl ? 'flex-end' : 'flex-start'
  /* Shadows take the brand's ground, highlights its paper. */
  const treatment = { mode: r.photo, shadow: c.primary, highlight: c.background } as const

  let body = ''

  if (kind === 'hero' || kind === 'story') {
    const tall = kind === 'story' ? 1920 : 1080
    const fieldTop = kind === 'story' ? 1240 : 640
    const fieldTall = tall - fieldTop

    /*
     * Photograph above, a block of the brand's ground below, type ranged left.
     *
     * The words cannot sit on the picture — the heading face may be COLR and
     * paint its own colour whatever `color` says, which is the constraint every
     * version of this layout has been built around. What changed is the shape
     * that carries them: a straight-edged field anchored to the bottom edge
     * rather than a wave floating across the middle of the photograph, and the
     * type ranged left against a margin instead of centred in the band.
     *
     * The scrim stays, and now earns itself twice: it lifts the reversed lockup
     * off the top of the picture, which is what let the white plate go.
     */
    body = `
      ${p.photo ? photo(p.photo, u, { top: 0, height: fieldTop + u(2) }, p.width, treatment) : `<div style="display:flex;position:absolute;inset:0;background:${c.primary}"></div>`}
      <div style="display:flex;position:absolute;left:0;top:0;width:${p.width}px;height:${u(360)}px;
        background:linear-gradient(to bottom, rgba(0,0,0,.45) 0%, rgba(0,0,0,0) 100%)"></div>
      ${lockup(p, u, rtl, c.primary)}
      ${field(p, u, { top: fieldTop, height: fieldTall }, c.background, r)}
      <div style="display:flex;flex-direction:column;position:absolute;left:${m}px;
        right:${m}px;top:${u(fieldTop + 78)}px;align-items:${ranged}">
        ${bar(p, u, c.secondary)}
        <div style="display:flex;margin-top:${u(34)}px;width:100%">
          ${headline(p, u, { size: Math.round((kind === 'story' ? 100 : 86) * r.scale), lead, tail, colour: c.text,
            tailColour: c.primary, align: r.align, rtl })}
        </div>
      </div>`
  }

  if (kind === 'feature') {
    /*
     * Hero, upside down: the words at the top on light, the photograph filling
     * the bottom two thirds.
     *
     * Both layouts are a picture and a field, and built the same way round they
     * were the same post twice in one kit. The inversion is the variety, and it
     * costs nothing — the headline still lands on light, which is the rule the
     * COLR heading face imposes on every layout in this file.
     */
    body = `
      <div style="display:flex;position:absolute;inset:0;background:${c.background}"></div>
      ${p.photo ? photo(p.photo, u, { top: 580, height: 500 }, p.width, treatment) : ''}
      ${lockup(p, u, rtl, c.background)}
      <div style="display:flex;flex-direction:column;position:absolute;left:${m}px;
        right:${m}px;top:${u(216)}px;align-items:${ranged}">
        ${bar(p, u, c.secondary)}
        <div style="display:flex;margin-top:${u(30)}px;width:100%">
          ${headline(p, u, { size: fitted(Math.round(72 * r.scale), lead, 34), lead, tail, colour: c.text,
            tailColour: c.primary, align: r.align, rtl })}
        </div>
      </div>`
  }

  if (kind === 'statement') {
    /* Which colour the whole square takes, named once so the lockup can be
       checked against the same value the ground is painted with. */
    const statementField = r.colour === 'full' ? c.primary : c.secondary
    /*
     * Colour, type, and nothing else.
     *
     * The mark used to be here at 620px and 12% opacity with a ghost wordmark
     * behind it — a watermark doing the job of a composition, and the thing
     * that made the post look like a template with the logo turned down. The
     * field is the brand's second colour, the type sits on a white block that
     * stops short of three edges, and the mark is absent: this is the post that
     * proves a brand can be recognised by colour and type alone.
     */
    body = `
      <div style="display:flex;position:absolute;inset:0;background:${statementField}"></div>
      ${lockup(p, u, rtl, statementField)}
      <div style="display:flex;flex-direction:column;position:absolute;left:${m}px;
        right:${m}px;top:${u(300)}px;bottom:${u(200)}px;background:${c.background};
        padding:${u(84)}px ${u(76)}px;justify-content:center;
        align-items:${ranged}">
        ${bar(p, u, c.secondary)}
        <div style="display:flex;margin-top:${u(38)}px;width:100%">
          ${headline(p, u, { size: fitted(Math.round(92 * r.scale), lead), lead, tail, colour: c.text, tailColour: c.primary,
            align: r.align, rtl })}
        </div>
      </div>
`
  }

  if (kind === 'detail') {
    /*
     * The photograph framed rather than cut out.
     *
     * It used to be clipped to the brand's gesture — the same silhouette that
     * carried every headline, used here as a window. With the gesture gone the
     * window went with it, and what holds the picture now is an offset block of
     * the accent colour: the frame is a margin and a shadow of colour, which is
     * the same idea an art director reaches for and does not need a custom path
     * to say.
     */
    body = `
      <div style="display:flex;position:absolute;inset:0;background:${c.background}"></div>
      <div style="display:flex;position:absolute;left:${u(150)}px;top:${u(240)}px;
        width:${u(820)}px;height:${u(520)}px;background:${c.accent}"></div>
      <div style="display:flex;position:absolute;left:${u(110)}px;top:${u(200)}px;
        width:${u(820)}px;height:${u(520)}px;overflow:hidden">
        ${p.photo ? `<img src="${p.photo}" width="${u(820)}" height="${u(520)}" style="object-fit:cover"/>`
          : `<div style="display:flex;width:100%;height:100%;background:${c.primary}"></div>`}
      </div>
      ${lockup(p, u, rtl, c.background)}
      <div style="display:flex;flex-direction:column;position:absolute;left:${u(110)}px;
        right:${u(110)}px;top:${u(830)}px;align-items:${ranged}">
        ${headline(p, u, { size: fitted(Math.round(62 * r.scale), lead), lead, tail, colour: c.text, tailColour: c.primary,
          align: r.align, rtl })}
      </div>`
  }

  if (kind === 'about') {
    /*
     * The one post meant to be read rather than seen.
     *
     * The brand story is the only content long enough to need a measure, so it
     * gets one: ranged left against the margin, at a size that survives a phone,
     * on a field that starts under a band of the photograph rather than a card
     * floating in the middle of it. The picture is a header, not a backdrop —
     * behind text at 22% it was neither.
     */
    body = `
      <div style="display:flex;position:absolute;inset:0;background:${c.background}"></div>
      ${p.photo ? photo(p.photo, u, { top: 0, height: 360 }, p.width, treatment) : ''}
      <div style="display:flex;position:absolute;left:0;top:0;width:${p.width}px;height:${u(300)}px;
        background:linear-gradient(to bottom, rgba(0,0,0,.45) 0%, rgba(0,0,0,0) 100%)"></div>
      ${lockup(p, u, rtl, c.primary)}
      <div style="display:flex;flex-direction:column;position:absolute;left:${m}px;
        right:${m}px;top:${u(440)}px;align-items:${ranged}">
        ${bar(p, u, c.secondary)}
        <div style="display:flex;margin-top:${u(30)}px;font-family:'${p.brand.fonts.heading}';
          font-size:${u(52)}px;line-height:1.18;color:${c.text};${rtl ? 'direction:rtl' : ''}"
          >${escape(lead)}</div>
        <div style="display:flex;margin-top:${u(26)}px;font-size:${u(32)}px;line-height:1.6;
          color:${c.primary};opacity:.86;${rtl ? 'direction:rtl' : ''}"
          >${escape(p.copy?.body ?? '')}</div>
      </div>`
  }

  if (kind === 'palette') {
    /*
     * The specimen page the reference deck opens with: the colours, named, and
     * the faces they are set in.
     *
     * Hex codes are on the swatches deliberately. This is the post a customer
     * screenshots and sends to whoever is printing their menu, and a swatch
     * without its value is decoration.
     */
    const swatches = [
      ['primary', c.primary], ['secondary', c.secondary],
      ['accent', c.accent], ['background', c.background],
    ] as const

    /*
     * The colours at full height, with their values set on them.
     *
     * They were four small rounded chips floating in the middle of a white
     * square with their labels underneath — a specification of the palette
     * rather than a demonstration of it, and the palest post in a kit whose
     * whole subject is colour. Full-bleed columns make the post the thing it is
     * about.
     *
     * Each label is checked against the colour it is written on rather than set
     * to one ink and hoped for: a #FFFFFF background swatch and a #1E293B
     * primary cannot share a label colour, and a generated palette will hand
     * over both.
     */
    const chips = swatches.map(([label, hex]) => {
      const ink = contrast('#ffffff', hex) >= contrast(c.text, hex) ? '#ffffff' : c.text
      const hairline = contrast('#ffffff', hex) < 1.3 ? `;box-shadow:inset 0 0 0 1px rgba(0,0,0,.10)` : ''
      return `
      <div style="display:flex;flex-direction:column;flex:1;justify-content:flex-end;
        background:${hex};padding:${u(34)}px ${u(30)}px${hairline}">
        <div style="display:flex;font-family:'${p.brand.fonts.body}';font-size:${u(26)}px;
          color:${ink};letter-spacing:${u(1)}px">${hex.toUpperCase()}</div>
        <div style="display:flex;font-size:${u(20)}px;color:${ink};opacity:.7;
          margin-top:${u(4)}px">${label}</div>
      </div>`
    }).join('')

    body = `
      <div style="display:flex;position:absolute;inset:0;background:${c.background}"></div>
      <div style="display:flex;position:absolute;left:0;top:0;width:${p.width}px;
        height:${u(560)}px">${chips}</div>
      <div style="display:flex;flex-direction:column;position:absolute;left:${m}px;right:${m}px;
        top:${u(660)}px">
        <div style="display:flex;justify-content:space-between;width:100%">
          <div style="display:flex;flex-direction:column">
            <div style="display:flex;font-size:${u(18)}px;letter-spacing:${u(3)}px;color:${c.primary};
              opacity:.5">HEADING</div>
            <div style="display:flex;font-family:'${p.brand.fonts.heading}';font-size:${u(52)}px;
              color:${c.text};margin-top:${u(10)}px">${escape(p.brand.fonts.heading)}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end">
            <div style="display:flex;font-size:${u(18)}px;letter-spacing:${u(3)}px;color:${c.primary};
              opacity:.5">BODY</div>
            <div style="display:flex;font-family:'${p.brand.fonts.body}';font-size:${u(52)}px;
              color:${c.text};margin-top:${u(10)}px">${escape(p.brand.fonts.body)}</div>
          </div>
        </div>
      </div>
      ${/* Reversed: the corner it sits in is the primary swatch, not paper. */ ''}
      ${lockup(p, u, rtl, c.primary)}`
  }

  if (kind === 'identity') {
    /*
     * The logo, presented rather than applied.
     *
     * A split field: the brand's ground above the fold, its second colour
     * below, the lockup centred in the upper field and clear of the join. It
     * sat across the join first, and the fold cut through the middle of the
     * wordmark — a composition and an accident look identical at that size. The wave that
     * used to hold the mark at the foot has gone with the rest of them, and so
     * has the caption under it — the subject of this post is the mark, and a
     * post that labels its own subject is a post that does not trust it.
     *
     * The reversed lockup, because both fields are dark; that is a file the kit
     * already produces and the reason it produces it.
     */
    body = `
      <div style="display:flex;position:absolute;inset:0;background:${c.primary}"></div>
      <div style="display:flex;position:absolute;left:0;top:${u(760)}px;width:${p.width}px;
        height:${u(320)}px;background:${c.secondary}"></div>
      <div style="display:flex;position:absolute;left:0;top:${u(140)}px;width:${p.width}px;
        height:${u(560)}px;align-items:center;justify-content:center;padding:0 ${u(150)}px">
        <img src="${p.wordmark}" width="${u(780)}" height="${u(300)}"
          style="object-fit:contain;filter:brightness(0) invert(1)"/>
      </div>`
  }

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    ${p.faces}
  </style></head><body><div style="width:${p.width}px;height:${p.height}px;position:relative;
    overflow:hidden;background:${c.primary};font-family:'${p.brand.fonts.body}'">${body}</div></body></html>`
}
