import 'server-only'

import { optimize } from 'svgo'

/**
 * The tracer, loaded when it is used.
 *
 * `@neplex/vectorizer` is a platform-specific `.node` binary and is the last
 * native dependency in this file. It is loaded on use rather than on import, so
 * a deployment that cannot load it still serves every route — including
 * `/api/inngest`, which once died on startup because this module was imported
 * anywhere in its graph.
 *
 * Everything else here is now pure JavaScript. See `resizePng` for why.
 */
let tracerPromise: Promise<typeof import('@neplex/vectorizer')> | null = null

function tracer() {
  tracerPromise ??= import('@neplex/vectorizer')
  return tracerPromise
}

export async function rasterToSvg(input: Buffer): Promise<string> {
  const { ColorMode, Hierarchical, PathSimplifyMode, vectorize } = await tracer()
  const { Jimp } = await import('jimp')

  // Trimming the plain background first means the trace does not spend paths on
  // empty margins, and posterising collapses JPEG-ish noise into flat regions
  // that VTracer can express as few, clean shapes.
  const image = await Jimp.read(input)
  image.autocrop()
  if (image.width > 1024 || image.height > 1024) image.scaleToFit({ w: 1024, h: 1024 })
  // Posterising is what let the tracer express flat artwork as few clean
  // shapes; without a median filter to hand, quantising the palette does the
  // same job of collapsing near-identical pixels into one region.
  image.posterize(16)
  const prepared = Buffer.from(await image.getBuffer('image/png'))

  const svg = await vectorize(prepared, {
    colorMode: ColorMode.Color,
    colorPrecision: 6,
    filterSpeckle: 4,
    spliceThreshold: 45,
    cornerThreshold: 60,
    hierarchical: Hierarchical.Stacked,
    mode: PathSimplifyMode.Spline,
    layerDifference: 16,
    lengthThreshold: 4,
    maxIterations: 10,
    pathPrecision: 3,
  })

  // SVGO 4 dropped removeViewBox from preset-default, so viewBox survives
  // without an override. removeDimensions then strips the fixed width/height
  // so the logo scales to whatever container it is dropped into.
  const optimised = optimize(svg, {
    multipass: true,
    plugins: ['preset-default', 'removeDimensions'],
  })

  return optimised.data
}

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

/** Jimp takes a single 0xRRGGBBAA integer where sharp took an object. */
function hexToInt(hex: string): number {
  const value = hex.replace('#', '')
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value
  const n = Number.parseInt(full.slice(0, 6), 16)
  return Number.isNaN(n) ? 0xffffffff : (n << 8) | 0xff
}

