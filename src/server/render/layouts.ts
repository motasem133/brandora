import 'server-only'

import { deviceFor, SHAPE_DEVICES, splitHeadline, type PostBrand } from './post-template'

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
function chip(p: Parts, u: (n: number) => number, rtl: boolean, onLight = false) {
  const inner = `<img src="${p.wordmark}" width="${u(190)}" height="${u(74)}" style="object-fit:contain"/>`
  const place = `position:absolute;top:${u(54)}px;${rtl ? `right:${u(54)}px` : `left:${u(54)}px`}`

  /*
   * On a light ground the plate is dropped and the wordmark stands on its own.
   *
   * The plate existed to lift a dark mark off a dark field. Kept on a light
   * layout it inverted to the brand colour and swallowed the mark whole — a
   * dark wordmark on a dark plate, invisible, which is exactly how it shipped
   * into the first full kit.
   */
  if (onLight) return `<div style="display:flex;${place};align-items:center">${inner}</div>`

  return `<div style="display:flex;${place};align-items:center;justify-content:center;
      background:${p.brand.palette.background};border-radius:${u(20)}px;
      padding:${u(18)}px ${u(26)}px">${inner}</div>`
}

/** The brand's gesture, as a band that can be flipped to cut either way. */
function device(p: Parts, u: (n: number) => number, top: number, tall: number, fill: string, flip = false) {
  const path = SHAPE_DEVICES[deviceFor(p.brand.style, p.brand.industry)]
  return `<svg width="${p.width}" height="${u(tall)}" viewBox="0 0 100 100" preserveAspectRatio="none"
      style="position:absolute;top:${u(top)}px;left:0${flip ? ';transform:scaleY(-1)' : ''}">
      <path d="${path}" fill="${fill}"/></svg>`
}

/** A photograph, filling its box, with the focal point kept off the edges. */
function photo(src: string, u: (n: number) => number, box: { top: number; height: number }, width: number) {
  return `<div style="display:flex;position:absolute;top:${u(box.top)}px;left:0;width:${width}px;
      height:${u(box.height)}px;overflow:hidden">
      <img src="${src}" width="${width}" height="${u(box.height)}" style="object-fit:cover"/></div>`
}

/**
 * The name, under a rule, the way every post in the reference signs off.
 *
 * One brand mention per post, which is why this and `chip` are never both
 * drawn. They were: the logo plate sat in the corner reading "Brandora" and
 * this printed "BRANDORA" across the foot of the same square, so every post in
 * every kit said the name twice — the tell of a template rather than a design.
 *
 * Which one a layout gets follows the layout. A photograph wants the real
 * lockup held in a corner, out of the picture's way; a flat field has room for
 * the sign-off and nothing to hold it away from. So: chip on the photographic
 * layouts, signature on the flat ones.
 */
function signature(p: Parts, u: (n: number) => number, bottom: number, colour: string) {
  return `<div style="display:flex;flex-direction:column;position:absolute;bottom:${u(bottom)}px;left:0;
      width:${p.width}px;align-items:center">
      <div style="display:flex;width:${u(120)}px;height:${u(5)}px;background:${p.brand.palette.secondary}"></div>
      <div style="display:flex;margin-top:${u(30)}px;font-size:${u(46)}px;color:${colour};
        letter-spacing:${u(6)}px">${escape(p.brand.name.toUpperCase())}</div></div>`
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
  const pad = u(88)

  let body = ''

  if (kind === 'hero' || kind === 'story') {
    const tall = kind === 'story' ? 1920 : 1080
    const plateTop = kind === 'story' ? 1090 : 520
    const plateTall = kind === 'story' ? 470 : 370

    /*
     * Photograph, scrim, then the words on a plate — not on the photograph.
     *
     * Setting the headline straight onto the image failed for a reason no
     * amount of scrim fixes: the brand's heading face is a COLR font, so it
     * paints its own red and ignores `color` entirely. Light type on a dark
     * picture was never available. The reference solves the same problem the
     * same way on every one of its posts — a shape in the brand's gesture,
     * light, with the headline inside it — so the constraint and the reference
     * agree.
     *
     * The scrim stays, for the chip and the signature, and because a generated
     * photograph can come back bright exactly where they sit.
     */
    body = `
      ${p.photo ? photo(p.photo, u, { top: 0, height: tall }, p.width) : `<div style="display:flex;position:absolute;inset:0;background:${c.primary}"></div>`}
      <div style="display:flex;position:absolute;left:0;top:0;width:${p.width}px;height:${u(tall)}px;
        background:linear-gradient(to bottom, rgba(0,0,0,.42) 0%, rgba(0,0,0,.04) 34%, rgba(0,0,0,.30) 62%, ${c.primary} 94%)"></div>
      ${chip(p, u, rtl)}
      <div style="display:flex;position:absolute;left:0;top:${u(plateTop)}px;width:${p.width}px;height:${u(plateTall)}px">
        ${device(p, u, 0, plateTall, c.background)}
        <div style="display:flex;flex-direction:column;position:absolute;top:0;left:0;width:${p.width}px;
          height:${u(plateTall)}px;align-items:center;justify-content:center;padding:0 ${u(110)}px">
          ${headline(p, u, { size: kind === 'story' ? 104 : 88, lead, tail, colour: c.text,
            tailColour: c.primary, align: 'center', rtl })}
        </div>
      </div>
`
  }

  if (kind === 'feature') {
    /*
     * Photograph above, the brand's gesture cutting into it, words below on
     * light.
     *
     * The panel was the brand's dark colour first, and the headline on it was
     * unreadable for the third time in this file: a COLR heading face paints
     * its own red whatever `color` says, so red landed on dark teal. That is
     * now a rule rather than three separate patches — the headline always sits
     * on light, and the layouts differ in where the light is, not in whether
     * it is there.
     */
    body = `
      <div style="display:flex;position:absolute;inset:0;background:${c.background}"></div>
      ${p.photo ? photo(p.photo, u, { top: 0, height: 620 }, p.width) : ''}
      ${device(p, u, 468, 200, c.background)}
      ${chip(p, u, rtl)}
      <div style="display:flex;flex-direction:column;position:absolute;left:${pad}px;right:${pad}px;top:${u(700)}px">
        ${headline(p, u, { size: 78, lead, tail, colour: c.text, tailColour: c.primary,
          align: 'center', rtl })}
      </div>`
  }

  if (kind === 'statement') {
    // No photograph at all: the mark, oversized and faint, is the picture.
    body = `
      <div style="display:flex;position:absolute;inset:0;background:${c.primary}"></div>
      <div style="display:flex;position:absolute;top:0;left:0;width:${p.width}px;height:${u(300)}px;overflow:hidden">
        <img src="${p.mark}" width="${u(620)}" height="${u(620)}" style="position:absolute;top:${u(-190)}px;
          ${rtl ? 'left' : 'right'}:${u(-120)}px;object-fit:contain;opacity:0.12"/></div>
      <div style="display:flex;position:absolute;left:0;top:${u(300)}px;width:${p.width}px;height:${u(470)}px">
        ${device(p, u, 0, 470, c.background)}
        <div style="display:flex;flex-direction:column;position:absolute;top:0;left:0;width:${p.width}px;
          height:${u(470)}px;align-items:center;justify-content:center;padding:0 ${u(110)}px">
          ${headline(p, u, { size: 104, lead, tail, colour: c.text, tailColour: c.primary, align: 'center', rtl })}
        </div></div>
      ${signature(p, u, 74, c.background)}`
  }

  if (kind === 'detail') {
    /*
     * The photograph held inside the brand's own gesture.
     *
     * This is the post that proves the shape is an identity and not a divider:
     * the same path that cuts the headline plate elsewhere is the window the
     * picture is seen through here.
     */
    const path = SHAPE_DEVICES[deviceFor(p.brand.style, p.brand.industry)]
    body = `
      <div style="display:flex;position:absolute;inset:0;background:${c.background}"></div>
      <svg width="0" height="0" style="position:absolute"><defs>
        <clipPath id="window" clipPathUnits="objectBoundingBox">
          <path d="${path}" transform="scale(0.01)"/></clipPath></defs></svg>
      <div style="display:flex;position:absolute;top:${u(210)}px;left:${u(120)}px;width:${u(840)}px;
        height:${u(560)}px;overflow:hidden;clip-path:url(#window)">
        ${p.photo ? `<img src="${p.photo}" width="${u(840)}" height="${u(560)}" style="object-fit:cover"/>`
          : `<div style="display:flex;width:100%;height:100%;background:${c.primary}"></div>`}
      </div>
      ${chip(p, u, rtl, true)}
      <div style="display:flex;flex-direction:column;position:absolute;left:${pad}px;right:${pad}px;top:${u(820)}px">
        ${headline(p, u, { size: 64, lead, tail, colour: c.text, tailColour: c.primary, align: 'center', rtl })}
      </div>`
  }

  if (kind === 'about') {
    /*
     * The one post meant to be read rather than seen.
     *
     * The brand story is prose the branding step already wrote, and it is the
     * only content here long enough to need a measure — so it gets one, at a
     * body size, on the light plate the rule requires. The photograph sits
     * behind it as a ground rather than beside it, because a column of text
     * and a picture competing at the same size is a magazine spread, not a
     * post.
     *
     * On the band, not on a rounded card. The card was this layout's own
     * private shape, and seen beside the other seven it was the one post that
     * did not belong to the set — the repetition of the gesture is what makes
     * eight pictures a kit. The band also runs edge to edge, which buys the
     * measure enough width to come up a size: this was the only post asking to
     * be read and it was set the smallest.
     */
    body = `
      <div style="display:flex;position:absolute;inset:0;background:${c.primary}"></div>
      ${p.photo ? `<div style="display:flex;position:absolute;inset:0;overflow:hidden;opacity:0.22">
        <img src="${p.photo}" width="${p.width}" height="${u(1080)}" style="object-fit:cover"/></div>` : ''}
      ${chip(p, u, rtl)}
      <div style="display:flex;position:absolute;left:0;top:${u(300)}px;width:${p.width}px;height:${u(780)}px">
        ${device(p, u, 0, 780, c.background)}
        <div style="display:flex;flex-direction:column;position:absolute;top:0;left:0;width:${p.width}px;
          height:${u(780)}px;align-items:center;justify-content:center;padding:${u(120)}px ${u(120)}px ${u(90)}px">
          <div style="display:flex;font-family:'${p.brand.fonts.heading}';font-size:${u(58)}px;
            line-height:1.2;color:${c.text};text-align:center;${rtl ? 'direction:rtl' : ''}"
            >${escape(lead)}</div>
          <div style="display:flex;width:${u(90)}px;height:${u(4)}px;background:${c.secondary};
            margin:${u(30)}px 0"></div>
          <div style="display:flex;font-size:${u(34)}px;line-height:1.6;color:${c.primary};
            opacity:0.86;text-align:center">${escape(p.copy?.body ?? '')}</div>
        </div>
      </div>
`
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

    const chips = swatches.map(([label, hex]) => `
      <div style="display:flex;flex-direction:column;flex:1;align-items:center">
        <div style="display:flex;width:100%;height:${u(230)}px;background:${hex};
          border-radius:${u(18)}px;border:1px solid rgba(0,0,0,.08)"></div>
        <div style="display:flex;font-family:'${p.brand.fonts.body}';font-size:${u(22)}px;
          margin-top:${u(18)}px;color:${c.primary};letter-spacing:${u(1)}px">${hex.toUpperCase()}</div>
        <div style="display:flex;font-size:${u(19)}px;color:${c.primary};opacity:.55">${label}</div>
      </div>`).join('')

    body = `
      <div style="display:flex;position:absolute;inset:0;background:${c.background}"></div>
      <div style="display:flex;flex-direction:column;position:absolute;left:${u(88)}px;right:${u(88)}px;
        top:${u(250)}px">
        <div style="display:flex;gap:${u(24)}px;width:100%">${chips}</div>
        <div style="display:flex;width:100%;height:${u(1)}px;background:${c.primary};
          opacity:.15;margin:${u(64)}px 0 ${u(46)}px"></div>
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
      ${signature(p, u, 74, c.primary)}`
  }

  if (kind === 'identity') {
    /*
     * The logo, presented rather than applied.
     *
     * Every other post uses the mark at chip size in a corner. This is the one
     * that shows it — full lockup on the brand's own ground, with the symbol
     * alone beside it, which is exactly the pair the kit now produces as
     * transparent files.
     *
     * No caption under it. The name is already set twice here in artwork — once
     * reversed on the ground, once in colour on the band — and a third in
     * letter-spaced capitals underneath was the post explaining what a reader
     * is plainly looking at. The subject of this one is the mark; it does not
     * need a label.
     */
    body = `
      <div style="display:flex;position:absolute;inset:0;background:${c.primary}"></div>
      ${device(p, u, 620, 460, c.background)}
      <div style="display:flex;position:absolute;left:0;top:${u(180)}px;width:${p.width}px;
        height:${u(360)}px;align-items:center;justify-content:center;padding:0 ${u(140)}px">
        <img src="${p.wordmark}" width="${u(800)}" height="${u(300)}"
          style="object-fit:contain;filter:brightness(0) invert(1)"/>
      </div>
      <div style="display:flex;position:absolute;left:0;top:${u(700)}px;width:${p.width}px;
        height:${u(230)}px;align-items:center;justify-content:center">
        <img src="${p.mark}" width="${u(230)}" height="${u(230)}" style="object-fit:contain"/>
      </div>
`
  }

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    ${p.faces}
  </style></head><body><div style="width:${p.width}px;height:${p.height}px;position:relative;
    overflow:hidden;background:${c.primary};font-family:'${p.brand.fonts.body}'">${body}</div></body></html>`
}
