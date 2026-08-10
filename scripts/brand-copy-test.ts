import assert from 'node:assert/strict'

import { BRAND_COPY_BOUNDS as B, brandCopy, brandCopyPatch } from '../src/lib/validations/brand'

/**
 * The contract a person and a model are both held to.
 *
 * The Brand Assistant could write these fields from the day it shipped; the
 * customer could only read them. Now both write, through one schema — and the
 * reason that matters is not tidiness. If the hand editor were looser, the
 * form would accept a story the generator would have refused; if the assistant
 * were looser, a paid feature would become a way to write something the free
 * form rejects. Either way the two disagree about what a brand may say.
 *
 * So this asserts the edges, on both sides. Off-by-one at a minimum is the
 * failure that actually happens: a `min(3)` quietly becoming `min(2)` breaks
 * nothing visible until a brand renders with two values in a row built for
 * three.
 *
 * Usage: pnpm test:brand-copy
 */

const chars = (n: number) => 'x'.repeat(n)

let failures = 0
function check(name: string, passed: boolean) {
  if (passed) return
  console.error(`✗ ${name}`)
  failures++
}

/* Every text field: one under the floor, the floor, the ceiling, one over. */
for (const field of ['slogan', 'brandStory', 'brandVoice'] as const) {
  const { min, max } = B[field]
  check(`${field} rejects ${min - 1}`, !brandCopy[field].safeParse(chars(min - 1)).success)
  check(`${field} accepts ${min}`, brandCopy[field].safeParse(chars(min)).success)
  check(`${field} accepts ${max}`, brandCopy[field].safeParse(chars(max)).success)
  check(`${field} rejects ${max + 1}`, !brandCopy[field].safeParse(chars(max + 1)).success)
}

/* Values are bounded twice — how many, and how long each one is. */
const values = (n: number, len = 5) => Array.from({ length: n }, () => chars(len))
check('values rejects two', !brandCopy.brandValues.safeParse(values(B.brandValues.min - 1)).success)
check('values accepts three', brandCopy.brandValues.safeParse(values(B.brandValues.min)).success)
check('values accepts five', brandCopy.brandValues.safeParse(values(B.brandValues.max)).success)
check('values rejects six', !brandCopy.brandValues.safeParse(values(B.brandValues.max + 1)).success)
check(
  'values rejects a one-character entry',
  !brandCopy.brandValues.safeParse(values(3, B.brandValues.itemMin - 1)).success,
)
check(
  'values rejects an over-long entry',
  !brandCopy.brandValues.safeParse(values(3, B.brandValues.itemMax + 1)).success,
)

/*
 * Whitespace is trimmed before the length is judged, so a slogan of three
 * spaces is empty rather than valid — the editor sends what was typed.
 */
check('a slogan of spaces is refused', !brandCopy.slogan.safeParse('   ').success)
check('surrounding space is trimmed', brandCopy.slogan.safeParse('  Ok now  ').data === 'Ok now')

/* The patch: one field is enough, none is not. */
check('an empty patch is refused', !brandCopyPatch.safeParse({}).success)
check('one field is a patch', brandCopyPatch.safeParse({ slogan: 'Built to last' }).success)
check(
  'a patch of every field is a patch',
  brandCopyPatch.safeParse({
    slogan: chars(B.slogan.min),
    brandStory: chars(B.brandStory.min),
    brandVoice: chars(B.brandVoice.min),
    brandValues: values(B.brandValues.min),
  }).success,
)
check(
  'a bad field fails the whole patch',
  !brandCopyPatch.safeParse({ slogan: 'Built to last', brandVoice: 'too short' }).success,
)

assert.equal(failures, 0, `${failures} brand-copy case(s) failed`)
console.log('✓ brand copy bounds hold at every edge, and the patch needs a field')
