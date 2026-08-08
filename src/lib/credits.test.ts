import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  BRAND_COST,
  BRAND_COST_STARTER,
  CREDIT_COSTS,
  brandsFrom,
  creditsForSections,
} from './credits'

/**
 * The exchange rate between credits and brands.
 *
 * PRODUCT.md sells brands, not credits: "20 brands a month" is the number on
 * the pricing cards, the comparison table and the billing page, and all three
 * derive it from here. A change to any section's price moves what every one of
 * those surfaces advertises, which is exactly the kind of arithmetic that
 * should not be discovered wrong by a customer.
 */

const FULL = { websiteBuilder: true, socialMediaKit: true }
const STARTER = { websiteBuilder: false, socialMediaKit: false }

test('a brand costs the sum of the sections it contains', () => {
  assert.equal(BRAND_COST, 13)
  assert.equal(
    BRAND_COST,
    CREDIT_COSTS.branding +
      CREDIT_COSTS.logos +
      CREDIT_COSTS.website +
      CREDIT_COSTS.social +
      CREDIT_COSTS.kit,
  )

  // The free plan's brand is a smaller object: no website, no designed kit.
  assert.equal(BRAND_COST_STARTER, 8)
  assert.ok(BRAND_COST_STARTER < BRAND_COST)
})

test('logos are the expensive section, which is where the pricing lever is', () => {
  // PRODUCT.md's claim: a fresh set of concepts is the most expensive thing a
  // customer can ask for, and the only one they ask for repeatedly.
  const dearest = Object.entries(CREDIT_COSTS).sort(([, a], [, b]) => b - a)[0]
  assert.equal(dearest[0], 'logos')
})

test('a starter plan reports the brands it can actually make, not zero', () => {
  /*
   * The defect this rate exists to prevent: the free plan grants 10 credits and
   * its entire promise is one brand. Counted at the full rate that is
   * `floor(10/13)` — zero — so the pricing page would have advertised a plan
   * that makes nothing.
   */
  assert.equal(brandsFrom(10, STARTER), 1)
  assert.equal(brandsFrom(10, FULL), 0)
})

test('brands are floored, because a partial brand is not a brand', () => {
  assert.equal(brandsFrom(BRAND_COST * 3, FULL), 3)
  assert.equal(brandsFrom(BRAND_COST * 3 - 1, FULL), 2)
  assert.equal(brandsFrom(0, FULL), 0)
})

test('a plan missing either paid section is counted at the starter rate', () => {
  // Both are required for the full kit, so either one absent makes it smaller.
  assert.equal(
    brandsFrom(100, { websiteBuilder: true, socialMediaKit: false }),
    brandsFrom(100, STARTER),
  )
  assert.equal(
    brandsFrom(100, { websiteBuilder: false, socialMediaKit: true }),
    brandsFrom(100, STARTER),
  )
})

test('sections are priced additively, and an empty run is free', () => {
  assert.equal(creditsForSections([]), 0)
  assert.equal(creditsForSections(['branding']), 1)
  assert.equal(creditsForSections(['branding', 'logos']), 7)
  assert.equal(
    creditsForSections(['branding', 'logos', 'website', 'social', 'kit']),
    BRAND_COST,
  )
})

test('a repeated section is charged twice, because it is generated twice', () => {
  // Regeneration is what customers do most, and it is a real API call each time.
  assert.equal(creditsForSections(['logos', 'logos']), CREDIT_COSTS.logos * 2)
})
