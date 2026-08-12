import 'server-only'

import { contrast } from '@/lib/brand-theme'
import { splitHeadline, type PostBrand } from './post-template'

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
function lockup(p: Parts, u: (n: number) => number, rtl: boolean, onLight = false) {
  const place = `position:absolute;top:${u(70)}px;${rtl ? `right:${u(88)}px` : `left:${u(88)}px`}`
  const invert = onLight ? '' : ';filter:brightness(0) invert(1)'
  return `<div style="display:flex;${place};align-items:center">
      <img src="${p.wordmark}" width="${u(210)}" height="${u(80)}"
        style="object-fit:contain${invert}"/></div>`
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
) {
  return `<div style="display:flex;position:absolute;left:0;top:${u(box.top)}px;
      width:${p.width}px;height:${u(box.height)}px;background:${fill}"></div>`
}



/** A photograph, filling its box, with the focal point kept off the edges. */
/** The accent, as a bar with a length rather than a rule with a colour. */
function bar(p: Parts, u: (n: number) => number, colour: string, width = 96) {
  return `<div style="display:flex;width:${u(width)}px;height:${u(8)}px;background:${colour}"></div>`
}

function photo(src: string, u: (n: number) => number, box: { top: number; height: number }, width: number) {
  return `<div style="display:flex;position:absolute;top:${u(box.top)}px;left:0;width:${width}px;
      height:${u(box.height)}px;overflow:hidden">
      <img src="${src}" width="${width}" height="${u(box.height)}" style="object-fit:cover"/></div>`
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
      ${p.photo ? photo(p.photo, u, { top: 0, height: fieldTop + u(2) }, p.width) : `<div style="display:flex;position:absolute;inset:0;background:${c.primary}"></div>`}
      <div style="display:flex;position:absolute;left:0;top:0;width:${p.width}px;height:${u(360)}px;
        background:linear-gradient(to bottom, rgba(0,0,0,.45) 0%, rgba(0,0,0,0) 100%)"></div>
      ${lockup(p, u, rtl)}
      ${field(p, u, { top: fieldTop, height: fieldTall }, c.background)}
      <div style="display:flex;flex-direction:column;position:absolute;left:${u(88)}px;
        right:${u(88)}px;top:${u(fieldTop + 78)}px;align-items:${rtl ? 'flex-end' : 'flex-start'}">
        ${bar(p, u, c.secondary)}
        <div style="display:flex;margin-top:${u(34)}px;width:100%">
          ${headline(p, u, { size: kind === 'story' ? 100 : 86, lead, tail, colour: c.text,
            tailColour: c.primary, align: 'start', rtl })}
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
      ${p.photo ? photo(p.photo, u, { top: 470, height: 610 }, p.width) : ''}
      ${lockup(p, u, rtl, true)}
      <div style="display:flex;flex-direction:column;position:absolute;left:${u(88)}px;
        right:${u(88)}px;top:${u(216)}px;align-items:${rtl ? 'flex-end' : 'flex-start'}">
        ${bar(p, u, c.secondary)}
        <div style="display:flex;margin-top:${u(30)}px;width:100%">
          ${headline(p, u, { size: 76, lead, tail, colour: c.text, tailColour: c.primary,
            align: 'start', rtl })}
        </div>
      </div>`
  }

  if (kind === 'statement') {
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
      <div style="display:flex;position:absolute;inset:0;background:${c.secondary}"></div>
      ${lockup(p, u, rtl)}
      <div style="display:flex;flex-direction:column;position:absolute;left:${u(88)}px;
        right:${u(88)}px;top:${u(300)}px;bottom:${u(200)}px;background:${c.background};
        padding:${u(84)}px ${u(76)}px;justify-content:center;
        align-items:${rtl ? 'flex-end' : 'flex-start'}">
        ${bar(p, u, c.secondary)}
        <div style="display:flex;margin-top:${u(38)}px;width:100%">
          ${headline(p, u, { size: 92, lead, tail, colour: c.text, tailColour: c.primary,
            align: 'start', rtl })}
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
      ${lockup(p, u, rtl, true)}
      <div style="display:flex;flex-direction:column;position:absolute;left:${u(110)}px;
        right:${u(110)}px;top:${u(830)}px;align-items:${rtl ? 'flex-end' : 'flex-start'}">
        ${headline(p, u, { size: 62, lead, tail, colour: c.text, tailColour: c.primary,
          align: 'start', rtl })}
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
      ${p.photo ? photo(p.photo, u, { top: 0, height: 360 }, p.width) : ''}
      <div style="display:flex;position:absolute;left:0;top:0;width:${p.width}px;height:${u(300)}px;
        background:linear-gradient(to bottom, rgba(0,0,0,.45) 0%, rgba(0,0,0,0) 100%)"></div>
      ${lockup(p, u, rtl)}
      <div style="display:flex;flex-direction:column;position:absolute;left:${u(88)}px;
        right:${u(88)}px;top:${u(440)}px;align-items:${rtl ? 'flex-end' : 'flex-start'}">
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
      <div style="display:flex;flex-direction:column;position:absolute;left:${u(88)}px;right:${u(88)}px;
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
      ${lockup(p, u, rtl)}`
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
