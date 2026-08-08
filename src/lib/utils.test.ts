import assert from 'node:assert/strict'
import { test } from 'node:test'

import { formatPrice, isCurrency, pickPrice } from './utils'

/**
 * Money, as a customer reads it.
 *
 * Polar is Merchant of Record and charges in the customer's currency, so a
 * figure here that differs from the invoice is the fastest way to lose someone
 * mid-checkout. These are the two functions between a stored integer and what
 * the pricing page prints.
 */

test('prices are stored in minor units and printed in major ones', () => {
  // $29.00 is 2900. Printing 2900 would advertise a plan at a hundred times its
  // price, and printing 29 would be right only by coincidence.
  assert.match(formatPrice(2900, 'usd'), /29/)
  assert.doesNotMatch(formatPrice(2900, 'usd'), /2900|2,900/)
})

test('whole amounts drop their cents and fractional ones keep them', () => {
  // "$29" reads as a price; "$29.00" reads as an invoice line. But AED 54.99
  // must not round to a figure nobody is ever charged.
  assert.doesNotMatch(formatPrice(2900, 'usd'), /\.00/)
  assert.match(formatPrice(5499, 'aed'), /54\.99/)
})

test('a missing price falls back to the currency that has one', () => {
  /*
   * Polar allows a product priced in only one currency, and a missing price
   * reads as 0. Showing "AED 0" for a paid plan advertises it as free, which is
   * the failure this function exists to prevent.
   */
  const chosen = pickPrice('aed', { usd: 2900, aed: 0 })

  assert.equal(chosen.currency, 'usd')
  assert.equal(chosen.amount, 2900)
  assert.equal(chosen.alternate, null)
})

test('a genuinely free product stays free in the requested currency', () => {
  // Zero in both currencies is a real price, not a missing one.
  const chosen = pickPrice('aed', { usd: 0, aed: 0 })

  assert.equal(chosen.currency, 'aed')
  assert.equal(chosen.amount, 0)
})

test('when both currencies are priced, the requested one wins', () => {
  const chosen = pickPrice('aed', { usd: 2900, aed: 10700 })

  assert.equal(chosen.currency, 'aed')
  assert.equal(chosen.amount, 10700)
  assert.deepEqual(chosen.alternate, { amount: 2900, currency: 'usd' })
})

test('isCurrency rejects anything not sold, including near misses', () => {
  // It guards a value straight off the query string.
  assert.equal(isCurrency('usd'), true)
  assert.equal(isCurrency('aed'), true)
  assert.equal(isCurrency('USD'), false)
  assert.equal(isCurrency('eur'), false)
  assert.equal(isCurrency(undefined), false)
})
