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
 * Re-encodes an image as JPEG for embedding in a document.
 *
 * The brand-kit PDF came out at 13MB because every photograph went in as PNG,
 * and PNG is a lossless format being asked to store a photograph — the worst
 * pairing there is. Nobody emails a 13MB attachment happily, and the deck is
 * meant to be sent.
 *
 * Only for artwork that has no transparency to lose. Logos stay PNG: JPEG has
 * no alpha channel, so a transparent mark would come back on a black square.
 */
export async function toJpeg(input: Buffer, quality = 82, fit?: number): Promise<Buffer> {
  const { Jimp } = await import('jimp')
  const image = await Jimp.read(input)

  /*
   * `fit` also caps the memory the decoder will need downstream.
   *
   * A 1536-square photograph embedded in a 1080x1920 page was enough for
   * Chromium to answer "Protocol error (Page.captureScreenshot): Unable to
   * capture screenshot" — the surface plus the decoded bitmap would not fit.
   * Nothing here is ever displayed above 1080, so carrying more pixels than
   * that only costs memory in the one place there is none to spare.
   */
  if (fit && (image.width > fit || image.height > fit)) image.scaleToFit({ w: fit, h: fit })

  return Buffer.from(await image.getBuffer('image/jpeg', { quality }))
}

/**
 * Shrinks a PNG while keeping its transparency.
 *
 * For artwork that has to stay transparent but is displayed small. The brand
 * kit PDF embedded the marks at full size — a 349x433 symbol went in at 269KB
 * with a soft mask, to be shown at about 190px — and every soft mask is alpha
 * the reader has to composite on each repaint, which is what made the document
 * stutter when scrolled. Fewer pixels is less to composite.
 */
export async function shrinkPng(input: Buffer, fit: number): Promise<Buffer> {
  const { Jimp } = await import('jimp')
  const image = await Jimp.read(input)

  if (image.width <= fit && image.height <= fit) return input

  image.scaleToFit({ w: fit, h: fit })
  return Buffer.from(await image.getBuffer('image/png'))
}

