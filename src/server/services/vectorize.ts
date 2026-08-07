import 'server-only'

/**
 * Image work that does not need a model, done in JavaScript.
 *
 * Tracing used to live here too, through `@neplex/vectorizer` — a
 * platform-specific `.node` binary that had to be lazily imported so a
 * deployment which could not load it still served `/api/inngest`. It is gone:
 * vectorising is a model call now, in `server/ai/image.ts`, and produced
 * measurably better SVGs than the tracer ever did. With it went the last
 * native dependency in the runtime, and the loader that had to tiptoe around
 * one.
 *
 * See `resizePng` for why the rest is jimp.
 */

/**
 * Square PNG at a given size, transparent-padded rather than cropped.
 *
 * Jimp rather than sharp. These are 32px favicons and avatars up to 1080px,
 * produced once per brand — there is no throughput here that justifies a native
 * dependency, and the native one could not be made to load on the platform this
 * runs on. Four attempts at that are recorded in the git history; this is the
 * fifth answer and it has no binary to lose.
 */
export async function resizePng(input: Buffer, size: number): Promise<Buffer> {
  const { Jimp } = await import('jimp')
  const logo = await Jimp.read(input)

  // Trim the flat margin first, so the mark fills the square it is given.
  logo.autocrop()
  // `contain` fits the whole mark inside the box and leaves the rest
  // transparent, which is what a favicon and an avatar both need — `cover`
  // would crop a wordmark's ends off.
  logo.contain({ w: size, h: size })

  return Buffer.from(await logo.getBuffer('image/png'))
}

/** Open Graph card: logo centred on the brand background colour. */
export async function makeOgImage(input: Buffer, background: string): Promise<Buffer> {
  const { Jimp } = await import('jimp')

  const logo = await Jimp.read(input)
  logo.autocrop()
  logo.contain({ w: 500, h: 500 })

  const card = new Jimp({ width: 1200, height: 630, color: hexToInt(background) })
  card.composite(logo, (1200 - logo.width) / 2, (630 - logo.height) / 2)

  return Buffer.from(await card.getBuffer('image/png'))
}

/** Single-colour version for stamps, watermarks and one-colour printing. */
export async function makeMonochrome(input: Buffer): Promise<Buffer> {
  const { Jimp } = await import('jimp')
  const logo = await Jimp.read(input)

  logo.autocrop()
  logo.greyscale()
  // Everything lighter than mid-grey becomes paper, everything darker becomes
  // ink. `normalize` first, so a logo drawn in soft greys still separates.
  logo.normalize()
  logo.threshold({ max: 160 })

  return Buffer.from(await logo.getBuffer('image/png'))
}

/** Reads an image's dimensions without a native decoder. */
export async function measure(input: Buffer): Promise<{ width?: number; height?: number }> {
  try {
    const { Jimp } = await import('jimp')
    const image = await Jimp.read(input)
    return { width: image.width, height: image.height }
  } catch {
    return {}
  }
}

/**
 * Jimp takes a single 0xRRGGBBAA integer where sharp took an object.
 *
 * `>>> 0` is load-bearing. JavaScript's bitwise operators work on *signed*
 * 32-bit integers, so `n << 8` overflows into a negative number for any colour
 * lighter than #7FFFFF — and Jimp rejects it outright:
 *
 *   RangeError: value must be >= 0 and <= 4294967295. Received -34216193
 *
 * That is not an edge case here. Generated brands are frequently light: the
 * first real palette this met had a #FAF6F0 paper, and the card it should have
 * drawn threw instead, taking the favicon, the avatars and the brand kit with
 * it. The unsigned shift is what makes the value a colour rather than a
 * negative number. Tested against a dark ground only, this bug is invisible.
 */
function hexToInt(hex: string): number {
  const value = hex.replace('#', '')
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value
  const n = Number.parseInt(full.slice(0, 6), 16)
  return Number.isNaN(n) ? 0xffffffff : (((n << 8) | 0xff) >>> 0)
}

