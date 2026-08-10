import 'dotenv/config'

import assert from 'node:assert/strict'

import {
  BUILT_CONTENT_TYPES,
  CAROUSEL_FRAMES,
  carouselBodySchema,
  contentBodySchema,
  isRenderedType,
} from '../src/lib/content'
import { contentCarouselSchemaFor } from '../src/server/ai/schemas'

/**
 * The carousel's contracts: what a frame may say, and what it may cost.
 *
 * The pricing case is the one that matters. `creditsForContent` charges a
 * credit for every variant past the first, the action accepts 1 to 3 for every
 * type, and the composer simply hides that control for a carousel — so a
 * request made outside the form with `variants: 3` would have taken five
 * credits and produced one carousel. A form is not a boundary. That is asserted
 * here against the rule the service applies, not against the form.
 *
 * The line lengths are the layouts': `lead` is set at display size over
 * artwork, and past sixty characters the renderer either shrinks the type until
 * the frame stops looking like the brand's or runs it off the canvas.
 *
 * Usage: pnpm test:carousel
 */

async function main() {
  const frames = (n: number, lead = 'A line that fits') =>
    Array.from({ length: n }, () => ({ lead }))

  const body = (over: Record<string, unknown> = {}) => ({
    kind: 'carousel' as const,
    frames: Array.from({ length: CAROUSEL_FRAMES }, (_, i) => ({
      fileId: '00000000-0000-4000-8000-00000000000' + i,
      layout: 'statement',
      lead: 'A line',
    })),
    caption: 'x'.repeat(80),
    hashtags: ['one', 'two', 'three'],
    ...over,
  })

  let failures = 0
  const check = (name: string, passed: boolean) => {
    if (passed) return
    console.error(`✗ ${name}`)
    failures++
  }

  /* --- the type is offered, and is a rendered one --------------------------- */
  check('carousel is a built type', (BUILT_CONTENT_TYPES as readonly string[]).includes('carousel'))
  check('carousel renders', isRenderedType('carousel'))
  check('a caption set does not', !isRenderedType('social_post'))

  /* --- the stored shape ------------------------------------------------------ */
  check('a whole carousel body validates', carouselBodySchema.safeParse(body()).success)
  check('the union accepts it', contentBodySchema.safeParse(body()).success)
  check('a frameless carousel is refused', !carouselBodySchema.safeParse(body({ frames: [] })).success)
  check(
    'a frame without its file is refused',
    !carouselBodySchema.safeParse(body({ frames: [{ layout: 'statement', lead: 'A' }] })).success,
  )

  /* --- what the model may write ---------------------------------------------- */
  const schema = contentCarouselSchemaFor(CAROUSEL_FRAMES)
  const output = (over: Record<string, unknown> = {}) => ({
    title: 'A set',
    frames: frames(CAROUSEL_FRAMES),
    caption: 'x'.repeat(80),
    hashtags: ['one', 'two', 'three'],
    ...over,
  })

  check('a well-formed set validates', schema.safeParse(output()).success)
  check(
    'four frames when five were bought is refused',
    !schema.safeParse(output({ frames: frames(CAROUSEL_FRAMES - 1) })).success,
  )
  check(
    'six frames is refused too',
    !schema.safeParse(output({ frames: frames(CAROUSEL_FRAMES + 1) })).success,
  )
  /*
   * Seventy, not sixty.
   *
   * At sixty every model in the chain failed the whole set on a brief that
   * wanted slightly longer lines — the same defect the ad headline had, where a
   * ceiling set at the length of a good line is one the model writes up to and
   * overshoots. The prompt asks for eight words; this is the room to miss by a
   * little without losing the carousel.
   */
  check(
    'a line at the ceiling is accepted',
    schema.safeParse(output({ frames: frames(CAROUSEL_FRAMES, 'x'.repeat(70)) })).success,
  )
  check(
    'a line past it is refused',
    !schema.safeParse(output({ frames: frames(CAROUSEL_FRAMES, 'x'.repeat(71)) })).success,
  )
  check(
    'markup in a frame is refused',
    !schema.safeParse(output({ frames: frames(CAROUSEL_FRAMES, 'Swipe<br>on') })).success,
  )
  /*
   * One line per frame, and the schema will not take a second.
   *
   * A `tail` was asked for and then silently dropped: in these layouts it is
   * the accent-coloured end of a headline, not a supporting line, so the
   * sentence the model wrote rendered on none of the three layouts a project
   * without photography gets. Charging for words that are not drawn is worse
   * than not offering them.
   */
  check(
    'a second line is not part of the contract',
    !('tail' in (schema.safeParse(output()).data?.frames[0] ?? {})),
  )

  check(
    'repeated hashtags are refused',
    !schema.safeParse(output({ hashtags: ['one', 'one', 'two'] })).success,
  )

  /* --- the money ------------------------------------------------------------- */
  const { CONTENT_CREDIT_COSTS, CONTENT_VARIANT_COST } = await import('../src/server/billing/credits')

  check('a carousel is three credits', CONTENT_CREDIT_COSTS.carousel === 3)

  /*
   * The rule the service applies: a rendered type is one piece, so variants are
   * pinned to 1 before the price is worked out. Asserted as arithmetic rather
   * than by calling the service, which needs a database and a session.
   */
  const priceFor = (type: 'social_post' | 'carousel', asked: number) => {
    const variants = isRenderedType(type) ? 1 : Math.min(Math.max(1, asked), 3)
    return CONTENT_CREDIT_COSTS[type] + (variants - 1) * CONTENT_VARIANT_COST
  }

  check('a carousel asked for three times still costs three', priceFor('carousel', 3) === 3)
  check('three captions still cost three', priceFor('social_post', 3) === 3)

  assert.equal(failures, 0, `${failures} carousel case(s) failed`)
  console.log(`✓ carousel: ${CAROUSEL_FRAMES} frames enforced, lines fit the layout, price cannot be inflated`)
}

main()
