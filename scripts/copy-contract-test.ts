import assert from 'node:assert/strict'

import { BLOCK_TYPES, blockSchema, createBlock } from '../src/lib/blocks'
import { socialSchema } from '../src/server/ai/schemas'

/**
 * The two copy contracts, asserted against what a model actually did.
 *
 * A real run wrote `<br>` through all nine Instagram captions, an empty bio and
 * the word "test" as all ten hashtags, and every one of them satisfied the
 * schema of the day. `socialSchema` was tightened afterwards; the website block
 * contract was not, and it is written by the same primary model. Nothing stored
 * was affected — that is luck, not a guarantee, and this is the guarantee.
 *
 * The last case is the opposite failure. A cap that sits exactly at the length
 * of a good headline is a cap the model writes up to and stops at, mid-sentence.
 *
 * Usage: pnpm test:copy
 */

const clean = {
  type: 'hero' as const,
  title: 'Snacks with something to them',
  subtitle: 'Made in small batches, sold by the people who make them.',
  cta: 'See the range',
}

let failures = 0

function check(name: string, passed: boolean) {
  if (passed) return
  console.error(`✗ ${name}`)
  failures++
}

check('a clean hero validates', blockSchema.safeParse(clean).success)

/* Every text field on the block, one tag each — this is the failure that shipped. */
for (const field of ['title', 'subtitle', 'cta'] as const) {
  check(
    `a tag in hero.${field} is refused`,
    !blockSchema.safeParse({ ...clean, [field]: `${clean[field]}<br>` }).success,
  )
}

check(
  'a tag nested in a features item is refused',
  !blockSchema.safeParse({
    type: 'features',
    heading: 'What you get',
    items: [{ title: 'Fresh', body: 'Baked this morning.<p>Sold today.</p>' }],
  }).success,
)

/*
 * The builder's own defaults have to satisfy the contract they are edited
 * under, or dragging a block in produces something that cannot be saved.
 */
for (const type of BLOCK_TYPES) {
  check(`the default ${type} block validates`, blockSchema.safeParse(createBlock(type)).success)
}

/** An angle bracket that is not a tag is ordinary punctuation, and stays legal. */
check(
  'a bare < is not treated as markup',
  blockSchema.safeParse({ ...clean, title: 'Better < cheaper, every time' }).success,
)

/** Room for a headline to finish its sentence past the old sixty-character cap. */
const headline = 'Stop eating sad, thin snacks — we are Chunky, and we are here for it'
check(
  `a ${headline.length}-character ad headline is accepted`,
  socialSchema.shape.adCopy.shape.headline.safeParse(headline).success,
)

assert.equal(failures, 0, `${failures} copy-contract case(s) failed`)
console.log(`✓ blocks refuse markup, ${BLOCK_TYPES.length} defaults validate, headline has room`)
