import 'server-only'

/**
 * Taking a logo apart: its background, its symbol and its name.
 *
 * Everything a model gives back is one flat picture — the mark, the wordmark
 * and a solid backdrop, fused. That backdrop is painted, not implied: the
 * vectoriser opens its SVG with `<path fill="#fffcf2" d="M0 0h2048v2048H0z"/>`
 * and the PNG has the same colour in every corner. So the logo could only ever
 * be placed on the one background it was born with; anywhere else it arrived in
 * a cream box.
 *
 * None of this calls a model. The backdrop is a known flat colour and a lockup
 * has real empty space between its parts, so both are measurable, which makes
 * this free, instant, and the same answer every time.
 */

/** How near a colour must be to the backdrop to vanish, and to survive. */
const VANISH = 24
const SURVIVE = 64

type Rgb = { r: number; g: number; b: number }

/** A region of the artwork, in fractions of the whole, so it maps to any size. */
export type Region = { x: number; y: number; w: number; h: number }

export type LockupParts = {
  text: { buffer: Buffer; region: Region }
  icon: { buffer: Buffer; region: Region }
}

function distance(a: Rgb, b: Rgb) {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2)
}

/**
 * The backdrop colour, read from the edge rather than assumed.
 *
 * The palette's background is stored on the project, but the model is only
 * asked for it — what it actually painted is what has to be removed, and the
 * two are frequently a few values apart. Sampling the border and taking the
 * most common value is what makes this work on the real file.
 */
function backdropOf(image: { bitmap: { data: Buffer; width: number; height: number } }): Rgb {
  const { data, width, height } = image.bitmap
  const at = (x: number, y: number): Rgb => {
    const i = (y * width + x) * 4
    return { r: data[i], g: data[i + 1], b: data[i + 2] }
  }

  const samples: Rgb[] = []
  const step = Math.max(1, Math.floor(Math.min(width, height) / 64))

  for (let x = 0; x < width; x += step) {
    samples.push(at(x, 0), at(x, height - 1))
  }
  for (let y = 0; y < height; y += step) {
    samples.push(at(0, y), at(width - 1, y))
  }

  // Modal colour, on a coarse grid so anti-aliasing does not split one colour
  // into a dozen near-identical votes.
  const votes = new Map<string, { colour: Rgb; count: number }>()
  for (const sample of samples) {
    const key = `${sample.r >> 3}:${sample.g >> 3}:${sample.b >> 3}`
    const seen = votes.get(key)
    if (seen) seen.count++
    else votes.set(key, { colour: sample, count: 1 })
  }

  return [...votes.values()].sort((a, b) => b.count - a.count)[0].colour
}

/**
 * Lifts the flat backdrop to transparency.
 *
 * Deliberately a colour key over the whole image rather than a flood fill from
 * the edges. A flood fill cannot reach the inside of an O or the gap in an A —
 * they are enclosed — so every counter in the wordmark would stay filled with
 * cream while the outside went clear, which looks worse than not trying.
 *
 * The band between `VANISH` and `SURVIVE` is what keeps the edges smooth:
 * anti-aliased pixels sit part-way between the artwork and the backdrop, and
 * giving them part-way alpha is the difference between a clean cut and a
 * fringe of cream crumbs around every letter.
 */
export async function liftBackground(input: Buffer): Promise<Buffer> {
  const { Jimp } = await import('jimp')
  const image = await Jimp.read(input)
  const backdrop = backdropOf(image)

  const { data } = image.bitmap

  for (let i = 0; i < data.length; i += 4) {
    const d = distance({ r: data[i], g: data[i + 1], b: data[i + 2] }, backdrop)

    if (d <= VANISH) data[i + 3] = 0
    else if (d < SURVIVE) data[i + 3] = Math.round(((d - VANISH) / (SURVIVE - VANISH)) * 255)
  }

  return Buffer.from(await image.getBuffer('image/png'))
}

/** Alpha at which a pixel counts as artwork rather than a lifted edge. */
const INK = 96

type Box = { x: number; y: number; w: number; h: number }

/** How much artwork sits in each column and each row of a rectangle. */
function profiles(data: Buffer, width: number, area: Box) {
  const columns = new Array<number>(width).fill(0)
  const rows = new Array<number>(area.y + area.h).fill(0)

  for (let y = area.y; y < area.y + area.h; y++) {
    for (let x = area.x; x < area.x + area.w; x++) {
      if (data[(y * width + x) * 4 + 3] > INK) {
        columns[x]++
        rows[y]++
      }
    }
  }

  return { columns, rows }
}

/**
 * Silences lines that hold only a speck.
 *
 * Lifting a backdrop leaves a scatter of half-transparent dust where the model
 * put noise, and a single surviving pixel is enough to make an empty band look
 * occupied. Measured on a real logo that was fatal: every candidate split came
 * back holding 100% of the artwork on one side and 0% on the other, because
 * the "gaps" were bounded by dust rather than by the mark.
 */
const denoise = (profile: number[], span: number) =>
  profile.map((n) => (n >= Math.max(3, span * 0.006) ? n : 0))

const extent = (profile: number[]) => {
  const first = profile.findIndex((n) => n > 0)
  if (first < 0) return null
  const last = profile.length - 1 - [...profile].reverse().findIndex((n) => n > 0)
  return { first, last }
}

/** Every interior stretch of nothing, with artwork on both sides of it. */
function gaps(profile: number[]) {
  const span = extent(profile)
  if (!span || span.last <= span.first) return []

  const found: { start: number; end: number; size: number }[] = []
  let run: number | null = null

  for (let i = span.first; i <= span.last; i++) {
    if (profile[i] === 0) run ??= i
    else if (run !== null) {
      found.push({ start: run, end: i, size: i - run })
      run = null
    }
  }

  return found
}

const total = (profile: number[]) => profile.reduce((sum, n) => sum + n, 0)

/**
 * The rectangle a piece of artwork actually occupies.
 *
 * Written by hand rather than using jimp's `autocrop`, which measured every
 * part of a real lockup as the full canvas height — so a wordmark that should
 * have reported an aspect of 4.06 reported 0.63, and the shape test below
 * rejected every correct split it was given.
 */
function contentBox(data: Buffer, width: number, area: Box): Box | null {
  const { columns, rows } = profiles(data, width, area)
  const across = extent(denoise(columns, area.h))
  const down = extent(denoise(rows, area.w))
  if (!across || !down) return null

  return {
    x: across.first,
    y: down.first,
    w: across.last - across.first + 1,
    h: down.last - down.first + 1,
  }
}

/**
 * Crops away the empty margin around a mark.
 *
 * A generated logo sits in the middle of a square with air on every side, so
 * anything that places it in a small box — a chip in the corner of a post, a
 * cell in a grid — is really scaling the air, and the mark lands as a dot.
 * `splitLockup` already trims each half it returns; this is the same trim for
 * artwork that has no split to make.
 */
export async function trim(transparent: Buffer): Promise<Buffer> {
  const { Jimp } = await import('jimp')
  const image = await Jimp.read(transparent)
  const { data, width, height } = image.bitmap

  const box = contentBox(data, width, { x: 0, y: 0, w: width, h: height })
  if (!box) return transparent

  return Buffer.from(await image.crop(box).getBuffer('image/png'))
}

/**
 * Splits a lockup into its name and its symbol.
 *
 * A lockup is two things with air between them, and after the backdrop is gone
 * that air is literally zero alpha — so the split is found by looking for the
 * widest empty band with artwork on both sides, horizontally and vertically,
 * and taking whichever is cleaner. That covers a symbol beside the name and a
 * symbol above it, which is every lockup this product generates.
 *
 * Returns null when there is no such band. That is the honest answer for a
 * monogram or an integrated mark, where the name and the symbol are one shape
 * and no amount of cropping separates them — and it is why the customer only
 * gets these files "if there is an icon with the text".
 */
export async function splitLockup(transparent: Buffer): Promise<LockupParts | null> {
  const { Jimp } = await import('jimp')
  const image = await Jimp.read(transparent)
  const { data, width, height } = image.bitmap
  const whole = { x: 0, y: 0, w: width, h: height }

  const raw = profiles(data, width, whole)
  const columns = denoise(raw.columns, height)
  const rows = denoise(raw.rows, width)
  const ink = total(columns)
  if (ink === 0) return null

  const winners: { size: number; boxes: [Box, Box]; aspects: [number, number] }[] = []

  for (const [axis, profile, span] of [
    ['x', columns, width],
    ['y', rows, height],
  ] as const) {
    for (const gap of gaps(profile)) {
      if (gap.size < Math.max(8, span * 0.015)) continue

      const middle = Math.round((gap.start + gap.end) / 2)

      /*
       * Both sides must actually hold artwork. Without this the widest gap
       * wins by default and the split lands beside a stray fleck, handing back
       * one file containing the entire logo and one containing nothing —
       * which is exactly what the first version of this shipped into a test.
       */
      const before = total(profile.slice(0, middle))
      const after = total(profile.slice(middle))
      if (Math.min(before, after) < ink * 0.12) continue

      const halves: [Box, Box] =
        axis === 'x'
          ? [
              { x: 0, y: 0, w: middle, h: height },
              { x: middle, y: 0, w: width - middle, h: height },
            ]
          : [
              { x: 0, y: 0, w: width, h: middle },
              { x: 0, y: middle, w: width, h: height - middle },
            ]

      const boxes = halves.map((half) => contentBox(data, width, half))
      if (!boxes[0] || !boxes[1]) continue

      const aspects = boxes.map((box) => box!.w / box!.h) as [number, number]
      const [wide, square] = aspects[0] >= aspects[1] ? aspects : [aspects[1], aspects[0]]

      // A name is a row of letters; a symbol is drawn to sit in a square.
      // Anything that does not look like both is not a lockup being split, it
      // is one mark being cut in half.
      if (wide < 2.0 || square < 0.45 || square > 2.2) continue

      winners.push({ size: gap.size, boxes: boxes as [Box, Box], aspects })
    }
  }

  if (winners.length === 0) return null

  const best = winners.sort((a, b) => b.size - a.size)[0]

  /*
   * The wider of the two is the name — far more reliable than position, which
   * flips between languages: an Arabic lockup puts the symbol where a Latin
   * one does not.
   */
  const order = best.aspects[0] >= best.aspects[1] ? [0, 1] : [1, 0]

  const parts = await Promise.all(
    order.map(async (index) => {
      const box = best.boxes[index]
      const piece = (await Jimp.read(transparent)).crop(box)

      return {
        buffer: Buffer.from(await piece.getBuffer('image/png')),
        region: { x: box.x / width, y: box.y / height, w: box.w / width, h: box.h / height },
      }
    }),
  )

  return { text: parts[0], icon: parts[1] }
}

/**
 * Removes the rectangle the vectoriser paints behind everything.
 *
 * Recraft emits the backdrop as the first path, covering the whole canvas:
 * `<path fill="#fffcf2" d="M0 0h2048v2048H0z"/>`. Dropping it is exact — there
 * is no tolerance to tune and no edge to feather, because the shape either
 * covers the canvas or it does not.
 */
export function stripSvgBackground(svg: string): string {
  const viewBox = svg.match(/viewBox="([\d.\-\s]+)"/)?.[1]?.trim().split(/\s+/).map(Number)
  if (!viewBox || viewBox.length !== 4) return svg

  const [, , width, height] = viewBox
  const round = (n: number) => Math.round(n)

  // `M0 0h{w}v{h}H0z` is the canonical form, but the numbers may carry decimals
  // and the closing command varies, so the match is on the shape it describes.
  const canvasPath = new RegExp(
    `<path[^>]*\\sd="M0 0[hH]${round(width)}(?:\\.\\d+)?[vV]${round(height)}(?:\\.\\d+)?[HhLl]0\\s*[zZ]"\\s*/?>`,
    'i',
  )

  const withoutPath = svg.replace(canvasPath, '')
  if (withoutPath !== svg) return withoutPath

  // Some encoders write a plain rect instead.
  return svg.replace(
    new RegExp(`<rect[^>]*\\swidth="(?:${round(width)}|100%)"[^>]*\\sheight="(?:${round(height)}|100%)"[^>]*/?>`, 'i'),
    '',
  )
}

/** The colour the vectoriser used for the backdrop, read from its canvas path. */
export function backdropFill(svg: string): string | null {
  const viewBox = svg.match(/viewBox="([\d.\-\s]+)"/)?.[1]?.trim().split(/\s+/).map(Number)
  if (!viewBox || viewBox.length !== 4) return null

  const [, , width, height] = viewBox
  const canvas = svg.match(
    new RegExp(
      `<path[^>]*\\sfill="(#[0-9a-f]{3,8})"[^>]*\\sd="M0 0[hH]${Math.round(width)}(?:\\.\\d+)?[vV]${Math.round(height)}(?:\\.\\d+)?[HhLl]0\\s*[zZ]"`,
      'i',
    ),
  )

  return canvas?.[1] ?? null
}

/**
 * Opens up the counters of a wordmark.
 *
 * The vectoriser does not cut holes: the inside of an "a" comes back as its own
 * shape, filled with the backdrop colour. Strip only the canvas rectangle and
 * those survive, so a logo placed on a dark header has solid cream blobs where
 * its letters should be see-through.
 *
 * Applied to the name alone and deliberately nowhere else. The same colour is
 * also real artwork elsewhere — in the concept this was written against, four
 * backdrop-coloured paths are the contents of a bowl inside the symbol, and
 * removing those by colour would hollow it out. Inside a wordmark there is
 * nothing that colour except a counter, which is what makes the narrow rule
 * safe and the broad one not.
 */
export function openCounters(svg: string, backdrop: string): string {
  const fill = backdrop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return svg.replace(new RegExp(`<path[^>]*\\sfill="${fill}"[^>]*/?>`, 'gi'), '')
}

/**
 * Narrows an SVG to one region of itself.
 *
 * The viewBox is moved rather than the paths, which keeps the geometry exactly
 * as the vectoriser drew it. A clip path goes with it because a viewBox crops
 * what is shown, not what exists, and a logo dropped into a container that
 * ignores overflow would otherwise leak the part that was cropped away.
 */
export function cropSvg(svg: string, region: Region): string {
  const match = svg.match(/viewBox="([\d.\-\s]+)"/)
  if (!match) return svg

  const [x0, y0, width, height] = match[1].trim().split(/\s+/).map(Number)
  if (!width || !height) return svg

  const box = {
    x: x0 + region.x * width,
    y: y0 + region.y * height,
    w: region.w * width,
    h: region.h * height,
  }

  const id = `crop-${Math.round(box.x)}-${Math.round(box.y)}`
  const clip =
    `<clipPath id="${id}"><rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}"/></clipPath>`

  return svg
    .replace(match[0], `viewBox="${box.x} ${box.y} ${box.w} ${box.h}"`)
    .replace(/(<svg[^>]*>)/, `$1<defs>${clip}</defs><g clip-path="url(#${id})">`)
    .replace(/<\/svg>\s*$/, '</g></svg>')
}
