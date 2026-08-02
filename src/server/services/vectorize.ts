import 'server-only'

import { ColorMode, Hierarchical, PathSimplifyMode, vectorize } from '@neplex/vectorizer'
import sharp from 'sharp'
import { optimize } from 'svgo'

/**
 * Raster logo to editable SVG.
 *
 * VTracer runs in-process, so tracing costs nothing per image and adds no
 * network hop. Quality is strong on flat vector artwork, which is exactly what
 * the logo prompt constrains Seedream to produce.
 */
export async function rasterToSvg(input: Buffer): Promise<string> {
  // Trimming the plain background first means the trace does not spend paths on
  // empty margins, and posterising collapses JPEG-ish noise into flat regions
  // that VTracer can express as few, clean shapes.
  const prepared = await sharp(input)
    .trim({ threshold: 12 })
    .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
    .median(3)
    .png({ palette: true, colours: 16 })
    .toBuffer()

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

/** Square PNG at a given size, transparent-padded rather than cropped. */
export async function resizePng(input: Buffer, size: number): Promise<Buffer> {
  return sharp(input)
    .trim({ threshold: 12 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
}

/** Open Graph card: logo centred on the brand background colour. */
export async function makeOgImage(input: Buffer, background: string): Promise<Buffer> {
  const logo = await sharp(input)
    .trim({ threshold: 12 })
    .resize(500, 500, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  return sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      background: hexToRgb(background),
    },
  })
    .composite([{ input: logo, gravity: 'centre' }])
    .png()
    .toBuffer()
}

/** Single-colour version for stamps, watermarks and one-colour printing. */
export async function makeMonochrome(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .trim({ threshold: 12 })
    .greyscale()
    .normalise()
    .threshold(160)
    .png()
    .toBuffer()
}

function hexToRgb(hex: string) {
  const normalised = hex.replace('#', '')
  return {
    r: parseInt(normalised.slice(0, 2), 16) || 255,
    g: parseInt(normalised.slice(2, 4), 16) || 255,
    b: parseInt(normalised.slice(4, 6), 16) || 255,
    alpha: 1,
  }
}
