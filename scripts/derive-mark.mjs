/**
 * logo.png -> public/brandora-mark.webp
 *
 * The supplied artwork is already exactly what the product needs: a four-point
 * star with a four-point star cut out of its centre, drawn with hard edges and
 * a blue-to-violet sweep, on a real alpha channel. Nothing about it needs
 * fixing. This script trims and converts it, and that is all.
 *
 *   node scripts/derive-mark.mjs
 *
 * Two things it does, both mechanical:
 *
 * 1. **Trims to the artwork.** The star occupies about 60% of the supplied
 *    1024px box, so an untrimmed asset draws a 24px star inside a 40px logo.
 *    The box here comes from the alpha channel, plus a small margin.
 * 2. **Converts to WebP** at 512px with alpha preserved, which is what
 *    `components/ui/logo.tsx` loads. The mark's largest use is 64px; Next
 *    resizes from here per breakpoint.
 *
 * ---
 *
 * Worth recording, because it cost a lot of work and produced a worse mark:
 *
 * This file previously keyed a "grey backdrop" out of the artwork, unmixed the
 * colour back out of that grey, thresholded a colour-distance field to find an
 * edge, and blurred the field to close the holes that punched. Every step was
 * solving a problem the file does not have. `logo.png` has an alpha channel and
 * always did — mean alpha 23, and 91% of it fully transparent. The "grey card"
 * was an image viewer compositing the transparent region onto its own grey
 * background, and the "neon glow" was the colour data PNG stores in fully
 * transparent pixels, which is invisible the moment alpha is respected.
 *
 * The cost was not only effort. Deriving a silhouette from RGB filled in the
 * star's centre hole — the one feature that makes the mark a mark rather than a
 * diamond — and rounded off edges the artwork had drawn hard.
 *
 * The lesson is cheap to restate: read the alpha channel before concluding an
 * image has a background. `sharp(file).stats()` answers it in one line.
 */
import { createRequire } from 'node:module'
import path from 'node:path'
import url from 'node:url'

const require = createRequire(import.meta.url)
const sharp = require('sharp')

const root = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..')
const SOURCE = path.join(root, 'logo.png')
const WEBP = path.join(root, 'public/brandora-mark.webp')
const PNG = path.join(root, 'public/brandora-mark.png')

/** Breathing room around the artwork, as a fraction of its longest side. */
const PAD = 0.06

const meta = await sharp(SOURCE).metadata()
if (!meta.hasAlpha) {
  throw new Error(
    `${path.relative(root, SOURCE)} has no alpha channel. It used to. Check the export before ` +
      `reaching for a background key — see the note at the top of this file.`,
  )
}

const { data, info } = await sharp(SOURCE).raw().toBuffer({ resolveWithObject: true })
const { width: w, height: h, channels: c } = info

// The box, straight off the alpha channel.
let minX = w
let minY = h
let maxX = -1
let maxY = -1
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    if (data[(y * w + x) * c + 3] > 8) {
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
}
if (maxX < 0) throw new Error(`${path.relative(root, SOURCE)} is entirely transparent.`)

const figW = maxX - minX + 1
const figH = maxY - minY + 1
const pad = Math.round(Math.max(figW, figH) * PAD)
// Square, so the mark never distorts in a square box.
const side = Math.min(w, h, Math.max(figW, figH) + pad * 2)
const box = {
  left: Math.max(0, Math.min(w - side, Math.round((minX + maxX) / 2 - side / 2))),
  top: Math.max(0, Math.min(h - side, Math.round((minY + maxY) / 2 - side / 2))),
  width: side,
  height: side,
}

const cropped = await sharp(SOURCE)
  .extract(box)
  .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer()

await sharp(cropped).webp({ quality: 92, alphaQuality: 100 }).toFile(WEBP)
// A small PNG beside it, for anything that cannot take a WebP.
await sharp(cropped).resize(256, 256).png({ compressionLevel: 9 }).toFile(PNG)

console.log(`figure ${figW}x${figH} in ${w}x${h} · crop ${side}px`)
console.log(`wrote ${path.relative(root, WEBP)} and ${path.relative(root, PNG)}`)
