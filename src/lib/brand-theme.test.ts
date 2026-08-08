import assert from 'node:assert/strict'
import { test } from 'node:test'

import { checkedSiteColors, contrast, fontStack } from './brand-theme'

/**
 * The contrast guard, tested where nothing else can see it fail.
 *
 * A published customer site once rendered its call to action at 1.42:1 and its
 * contact email at 1.39:1 while this exact arithmetic sat correct and unused
 * two directories away. Nothing caught it: the HTTP suite does not read colour,
 * the browser suite runs one fixture brand whose palette happens to be fine,
 * and no palette in the database was hostile enough to show it.
 *
 * `scripts/contrast-test.ts` asserts the same floor against whole palettes.
 * These cover the arithmetic underneath it, including the two cases that are
 * the reason the floor is enforced by stepping rather than by a percentage.
 */

const BODY_MIN = 4.5

test('contrast matches the WCAG reference pairs', () => {
  // The two anchors of the scale. Anything else drifting is a curve bug.
  assert.equal(Math.round(contrast('#000000', '#ffffff')), 21)
  assert.equal(contrast('#ffffff', '#ffffff'), 1)

  // Symmetric: the ratio does not depend on which argument is the ground.
  assert.equal(contrast('#7240ff', '#05070f'), contrast('#05070f', '#7240ff'))
})

test('contrast uses the sRGB curve, not a naive channel average', () => {
  /*
   * #808080 is the midpoint by channel value and nowhere near it by luminance.
   * A naive average would put this at roughly 2.0 against both ends; the real
   * curve does not, and that gap is exactly the bug this function exists to
   * avoid.
   */
  const onWhite = contrast('#808080', '#ffffff')
  const onBlack = contrast('#808080', '#000000')

  assert.ok(onWhite > 3.9 && onWhite < 4.0, `expected ~3.95 on white, got ${onWhite}`)
  assert.ok(onBlack > 5.3 && onBlack < 5.4, `expected ~5.32 on black, got ${onBlack}`)
})

test('an unparseable colour reads as no contrast rather than throwing', () => {
  // Generated palettes are untrusted input. A model returning "navy" must
  // degrade to the fallback path, not take a published site down.
  assert.equal(contrast('navy', '#ffffff'), 1)
  assert.equal(contrast('#fff', '#ffffff'), 1)
  assert.equal(contrast('', '#ffffff'), 1)
})

test('a hostile palette still clears the body floor on every checked pair', () => {
  /*
   * The shape of the generation that caused the original defect: a light
   * primary and near-white text on a near-white ground. Every value here is
   * unreadable as given, so every one of them has to be replaced.
   */
  const colors = checkedSiteColors({
    background: '#fdfdfb',
    text: '#f4f4f0',
    primary: '#f9d976',
  })

  assert.ok(
    contrast(colors.ink, colors.paper) >= BODY_MIN,
    `ink ${colors.ink} on ${colors.paper} measured ${contrast(colors.ink, colors.paper)}`,
  )
  assert.ok(
    contrast(colors.accent, colors.paper) >= BODY_MIN,
    `accent ${colors.accent} on ${colors.paper} measured ${contrast(colors.accent, colors.paper)}`,
  )
  assert.ok(
    contrast(colors.onPrimary, colors.primary) >= BODY_MIN,
    `onPrimary ${colors.onPrimary} on ${colors.primary}`,
  )
})

test('muted text clears the floor, which a flat 42% mix cannot', () => {
  /*
   * This is the arithmetic claim in brand-theme's own comment: mixing 42% of
   * anything into its own background caps out near 2.5:1 and cannot reach 4.5:1
   * for any ink and paper in existence. `softened` steps back toward full ink
   * until it clears instead, so the assertion is that it always does.
   */
  for (const [background, text] of [
    ['#ffffff', '#000000'],
    ['#05070f', '#ffffff'],
    ['#1b3a3a', '#fefaf5'],
    ['#f9d976', '#3a2a00'],
  ]) {
    const colors = checkedSiteColors({ background, text, primary: '#7240ff' })
    const measured = contrast(colors.muted, colors.paper)

    assert.ok(
      measured >= BODY_MIN,
      `muted ${colors.muted} on ${colors.paper} measured ${measured.toFixed(2)}`,
    )
  }
})

test('a usable palette is passed through rather than overridden', () => {
  // The guard replaces what fails and must not repaint what does not: a brand
  // whose palette is already readable should render in its own colours.
  const colors = checkedSiteColors({
    background: '#fefaf5',
    text: '#1b3a3a',
    primary: '#8a1c1c',
  })

  assert.equal(colors.paper, '#fefaf5')
  assert.equal(colors.ink, '#1b3a3a')
  assert.equal(colors.accent, '#8a1c1c')
})

test('fontStack quotes a generated family and falls back when absent', () => {
  // Family names arrive from a model and routinely contain spaces.
  assert.equal(fontStack('Reem Kufi Ink'), '"Reem Kufi Ink", var(--font-sans)')
  assert.equal(fontStack(null), 'var(--font-sans)')
  assert.equal(fontStack(''), 'var(--font-sans)')
})
