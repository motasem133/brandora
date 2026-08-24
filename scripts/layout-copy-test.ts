/* Only for the module graph: `carouselPlan` lives beside the pipeline that
   uses it, and importing that reaches the env-checked database module. */
import 'dotenv/config'

import { LAYOUTS, renderLayout, type LayoutKind } from '../src/server/render/layouts'
import { carouselPlan } from '../src/server/inngest/content'
import type { PostBrand } from '../src/server/render/post-template'

/**
 * The contract between what a model is asked to write and what a layout draws.
 *
 * This is the check that would have caught the defect a customer reported: a
 * carousel briefed "we are launching soon" came back as one line, a logo with
 * no words, and a sheet of hex codes. The model had written three lines and
 * been paid for them; two of the three layouts in the plan draw no words at
 * all, and nothing anywhere failed.
 *
 * `renderLayout` is a pure function from parts to HTML, so the whole contract
 * is testable without a browser, without storage and without a model — which
 * is why there is no excuse for it not to have existed.
 *
 * Run: pnpm test:layouts
 */

const SENTINEL = 'ZZQQ the line the customer paid for ZZQQ'

const brand: PostBrand = {
  name: 'Fixture Brand',
  slogan: 'A slogan for the fallback path.',
  industry: 'coffee',
  style: 'modern',
  palette: {
    primary: '#1E293B',
    secondary: '#7C3AED',
    background: '#FFFFFF',
    text: '#0B1020',
    accent: '#3B82F6',
  },
  fonts: { heading: 'Inter', body: 'Inter' },
}

function html(layout: LayoutKind, ink: number) {
  const size = LAYOUTS[layout].size
  return renderLayout(layout, {
    brand,
    faces: '',
    wordmark: 'data:image/png;base64,AA',
    mark: 'data:image/png;base64,AA',
    photo: LAYOUTS[layout].needs ? 'data:image/jpeg;base64,AA' : null,
    width: size.width,
    height: size.height,
    ink,
    copy: { lead: SENTINEL, tail: null },
  })
}

const failures: string[] = []
const check = (ok: boolean, message: string) => {
  if (!ok) failures.push(message)
}

for (const layout of Object.keys(LAYOUTS) as LayoutKind[]) {
  const out = html(layout, 0.1)
  const draws = out.includes(SENTINEL)

  if (LAYOUTS[layout].copy === 'none') {
    check(!draws, `${layout} declares copy:none but drew the line it was handed`)
  } else {
    check(draws, `${layout} declares copy:${LAYOUTS[layout].copy} and drew nothing`)
  }

  /* The mark is placed, never replaced. `brightness(0) invert(1)` flattens a
     logo to its own silhouette, which is how a two-tone mark stopped being the
     mark the customer chose. */
  check(
    !out.includes('brightness(0)'),
    `${layout} destroys the logo with a knockout filter`,
  )

  /* A type block with nothing in it is a gap in the frame. Colour fields are
     empty divs too and are the point, so this looks only at the ones set in a
     face — which is exactly what `about` drew for every carousel, because
     Content Studio hands it a headline and no prose. */
  check(
    !/<div style="[^"]*font-size[^"]*"\s*><\/div>/.test(out.replace(/\s*\n\s*/g, ' ')),
    `${layout} rendered an empty text block`,
  )
}

/* Dark ink on a dark ground has to be given something to stand on, and light
   ink on the same ground must not be. Both read off the same measurement. */
const darkInk = html('identity', 0.05)
const lightInk = html('identity', 0.95)
check(darkInk.includes('border-radius'), 'a dark mark was left to vanish into a dark field')
check(
  lightInk.split('border-radius').length < darkInk.split('border-radius').length,
  'a light mark was plated on a dark field it already contrasts with',
)

/* The plan a carousel is drawn from: every frame carries words, and the last
   one is the mark. A brand with no kit photography is the case that broke. */
const noKit = carouselPlan({})
const fullKit = carouselPlan({ hero: 'a', people: 'b', detail: 'c' })

for (const [name, plan] of [['no kit', noKit], ['full kit', fullKit]] as const) {
  check(plan.length > 0, `${name}: planned no frames at all`)
  check(plan.at(-1) === 'closing', `${name}: the sequence does not end on the mark`)
  for (const layout of plan) {
    check(
      LAYOUTS[layout].copy !== 'none',
      `${name}: planned ${layout}, which draws none of what the model writes`,
    )
  }
}

check(fullKit.length === 5, `full kit planned ${fullKit.length} frames, expected 5`)
check(noKit.length === 2, `no kit planned ${noKit.length} frames, expected 2`)

if (failures.length) {
  console.error(`✗ ${failures.length} failed:`)
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exit(1)
}

console.log(`✓ layout copy contract holds across ${Object.keys(LAYOUTS).length} layouts`)
console.log(`  no kit:   ${noKit.join(' → ')}`)
console.log(`  full kit: ${fullKit.join(' → ')}`)
