import 'server-only'

/**
 * One social post, drawn from what a brand already stores.
 *
 * The reference for this is a paint company's kit whose whole identity rests on
 * one repeated gesture — a torn brush stroke holding every headline. The
 * gesture is not decoration: it is why nine posts read as one brand. So the
 * gesture here is chosen from the brand's own style rather than picked once for
 * the product, and everything else on the canvas — palette, faces, mark,
 * slogan — is already in the database by the time a logo run finishes.
 */

export type PostBrand = {
  name: string
  slogan: string | null
  industry: string | null
  style: string | null
  palette: { primary: string; secondary: string; background: string; text: string; accent: string }
  fonts: { heading: string; body: string }
}

/**
 * The shape devices, each a path across a 100x100 box, stretched to fill a band.
 *
 * Four is deliberately few. A larger library makes the product look
 * indecisive rather than varied, and these cover the registers the brand model
 * actually returns.
 */
export const SHAPE_DEVICES = {
  /** Torn paper and brush — organic, handmade, food, craft. */
  brush:
    'M0,18 C8,10 14,22 24,15 C33,9 39,20 49,14 C58,9 66,19 75,13 C84,8 92,17 100,12 L100,88 C92,94 84,84 75,90 C66,95 58,86 49,91 C39,96 33,85 24,91 C14,97 8,86 0,93 Z',
  /** A hard diagonal cut — industrial, technical, corporate. */
  wedge: 'M0,0 L100,10 L100,90 L0,100 Z',
  /** A pointed arch — the register an "arabic" brand style asks for. */
  arch: 'M0,100 L0,42 C0,20 22,0 50,0 C78,0 100,20 100,42 L100,100 Z',
  /**
   * A soft organic band — playful, youthful, retail.
   *
   * An edge, not an island, and that is the whole correction. This was a closed
   * blob starting at x=4 and closing at x=2, which is a fine shape at 1:1 and
   * becomes a sticker the moment it is stretched: `device()` draws these full
   * width with `preserveAspectRatio="none"`, so a silhouette that curves in at
   * both ends renders as a flattened white oval floating over the photograph,
   * cropping whoever is in it at the waist. Every playful brand's kit shipped
   * that way.
   *
   * The other three read correctly because they are bands — they touch x=0 and
   * x=100 and only shape the edge between. This one now does too: an uneven top
   * edge, a flat bottom, full bleed both sides.
   */
  blob: 'M0,30 C16,6 34,32 52,18 C70,4 86,26 100,14 L100,100 L0,100 Z',
} as const

export type ShapeDevice = keyof typeof SHAPE_DEVICES

/**
 * How a brand is *set*, as opposed to what colour it is.
 *
 * A kit that reads the same for a coffee roaster and a fintech is a template
 * with the palette swapped, which is exactly what the shell became when the
 * per-brand gesture was removed from it. Colour and typeface already differ per
 * brand and are not enough on their own: the arrangement carries as much of the
 * register as the palette does, and it was identical for everyone.
 *
 * So the composition is parameterised too. Each register decides the margin,
 * how the type is ranged and scaled, whether corners are cut square, how much
 * of the palette becomes field rather than accent, and whether a field's edge
 * is a straight line or the brand's own curve. Same layouts, different bearing.
 *
 * Chosen from fields the project already carries — the style the customer picked
 * at the wizard, and the industry they typed — so nothing new is asked of them.
 */
export type Register = {
  /** The page margin, in 1080-space. Room is itself an expression. */
  margin: number
  /** Where the type ranges. Centred reads formal; left reads editorial. */
  align: 'start' | 'center'
  /** Multiplier on every headline in the kit. */
  scale: number
  /** Corner radius on fields and framed pictures. */
  radius: number
  /** Whether a field's leading edge is straight or takes the brand's curve. */
  edge: 'straight' | 'curve'
  /** How much of the palette runs as field rather than as a bar. */
  colour: 'restrained' | 'full'
  /** Small caps and tracking on the standing details. */
  formal: boolean
}

const REGISTERS = {
  /** Sharp, ranged left, plenty of room. Technology, corporate, consultancy. */
  editorial: { margin: 88, align: 'start', scale: 1, radius: 0, edge: 'straight', colour: 'restrained', formal: false },
  /** Big type, colour as field, tight margins. Bold, playful, retail, sport. */
  loud: { margin: 72, align: 'start', scale: 1.16, radius: 10, edge: 'straight', colour: 'full', formal: false },
  /** Centred, generous, quiet. Luxury, jewellery, hospitality, an Arabic register. */
  refined: { margin: 132, align: 'center', scale: 0.92, radius: 0, edge: 'straight', colour: 'restrained', formal: true },
  /** Soft edges and warm fields. Food, beauty, wellness, craft. */
  organic: { margin: 96, align: 'start', scale: 1, radius: 26, edge: 'curve', colour: 'full', formal: false },
} as const satisfies Record<string, Register>

export function registerFor(style: string | null, industry: string | null): Register {
  if (style === 'luxury' || style === 'arabic' || style === 'elegant') return REGISTERS.refined
  if (style === 'bold' || style === 'playful') return REGISTERS.loud
  if (/food|beverage|coffee|craft|beauty|wellness|floris|bakery/i.test(industry ?? '')) return REGISTERS.organic
  if (style === 'minimal') return { ...REGISTERS.editorial, margin: 132, scale: 0.94 }
  return REGISTERS.editorial
}

/** Which gesture belongs to which brand, from fields the project already has. */
export function deviceFor(style: string | null, industry: string | null): ShapeDevice {
  if (style === 'arabic' || style === 'luxury') return 'arch'
  if (style === 'playful' || style === 'bold') return 'blob'
  if (style === 'corporate' || style === 'minimal' || style === 'tech') return 'wedge'
  if (/food|beverage|craft|beauty|wellness/i.test(industry ?? '')) return 'brush'
  return 'brush'
}

/**
 * Splits a bilingual line into its two halves.
 *
 * The reference sets a key phrase in one colour and the rest in another, on
 * every post. Slogans arrive here as "العربية | the english", which is the same
 * two-part structure under another name.
 */
export function splitHeadline(text: string) {
  const [lead, ...rest] = text.split('|').map((part) => part.trim())
  return { lead, tail: rest.join(' ') || null }
}

const hasArabic = (value: string) => /[؀-ۿ]/.test(value)

/** Escapes text that reaches the markup from a brand's own fields. */
function escape(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * A `@font-face` rule carrying the whole file.
 *
 * Brand faces are fetched and inlined rather than linked, because the render
 * waits on `document.fonts.ready` and a network round trip inside a serverless
 * function is both slower and able to fail in a way that silently swaps the
 * typeface for a fallback.
 */
export function fontFace(family: string, ttf: Buffer) {
  return `@font-face{font-family:'${family.replace(/'/g, '')}';src:url(data:font/ttf;base64,${ttf.toString('base64')}) format('truetype');font-display:block}`
}

export function squarePost(params: {
  brand: PostBrand
  /** The name alone, trimmed — this is the chip, so the full square would land as a dot. */
  wordmark: string
  /** The symbol alone, trimmed — used oversized and faint as a ground. */
  mark: string
  faces: string
  size?: number
}) {
  const { brand, wordmark, mark, faces } = params
  const size = params.size ?? 1080
  const p = brand.palette
  const device = SHAPE_DEVICES[deviceFor(brand.style, brand.industry)]
  const { lead, tail } = splitHeadline(brand.slogan?.trim() || brand.name)
  const rtl = hasArabic(lead)

  // A plain number; every call site appends its own unit. Returning "56px"
  // here and appending px at the call site produced "56pxpx", which the
  // browser drops — and every element landed at its default position.
  const u = (n: number) => Math.round((n / 1080) * size)

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    ${faces}
  </style></head><body>
  <div style="width:${size}px;height:${size}px;display:flex;position:relative;overflow:hidden;
              background:${p.primary};font-family:'${brand.fonts.body}'">

    <!--
      The mark as a ground texture, held in a clipped band at the top.

      Anchored to the bottom corner it read straight through the brand name —
      on a real brand you could make out "…ouse hold" behind the name in the
      footer. There is nothing to collide with up here.
    -->
    <div style="display:flex;position:absolute;top:0;left:0;width:${size}px;height:${u(300)}px;overflow:hidden">
      <img src="${mark}" width="${u(620)}" height="${u(620)}" style="position:absolute;
           top:${u(-190)}px;${rtl ? 'left' : 'right'}:${u(-120)}px;object-fit:contain;opacity:0.12"/>
    </div>

    <div style="display:flex;position:absolute;top:${u(54)}px;${rtl ? `right:${u(54)}px` : `left:${u(54)}px`};
                align-items:center;justify-content:center;background:${p.background};
                border-radius:${u(20)}px;padding:${u(18)}px ${u(26)}px">
      <img src="${wordmark}" width="${u(190)}" height="${u(74)}" style="object-fit:contain"/>
    </div>

    <!--
      The plate: the brand's gesture, holding the words.

      The heading face sits on the light plate rather than the dark ground for
      a reason found by rendering it — Reem Kufi Ink is a COLR font, so it
      paints its own colour and ignores whatever CSS asks for. A light plate
      turns that from a bug into the accent.
    -->
    <div style="display:flex;position:absolute;left:0;top:${u(300)}px;width:${size}px;height:${u(470)}px">
      <svg width="${size}" height="${u(470)}" viewBox="0 0 100 100" preserveAspectRatio="none"
           style="position:absolute;top:0;left:0"><path d="${device}" fill="${p.background}"/></svg>
      <div style="display:flex;flex-direction:column;position:absolute;top:0;left:0;width:${size}px;
                  height:${u(470)}px;align-items:center;justify-content:center;padding:0 ${u(110)}px">
        <div style="display:flex;font-family:'${brand.fonts.heading}';font-size:${u(104)}px;
                    line-height:1.2;text-align:center;color:${p.text};${rtl ? 'direction:rtl' : ''}"
             >${escape(lead)}</div>
        ${tail ? `<div style="display:flex;font-size:${u(38)}px;line-height:1.35;margin-top:${u(22)}px;
                    color:${p.primary};opacity:0.75;text-align:center">${escape(tail)}</div>` : ''}
      </div>
    </div>

    <div style="display:flex;flex-direction:column;position:absolute;bottom:${u(74)}px;left:0;
                width:${size}px;align-items:center">
      <div style="display:flex;width:${u(120)}px;height:${u(5)}px;background:${p.secondary}"></div>
      <div style="display:flex;margin-top:${u(30)}px;font-size:${u(46)}px;color:${p.background};
                  letter-spacing:${u(6)}px">${escape(brand.name.toUpperCase())}</div>
    </div>
  </div></body></html>`
}
