import 'server-only'

import { Polar } from '@polar-sh/sdk'

import { env } from '@/lib/env'
import { AppError } from '@/lib/errors'

/**
 * Polar is the Merchant of Record: it buys the product from us and resells it,
 * so international VAT, GST and US sales tax are owed by Polar rather than by
 * this business. That is the entire reason it is worth ~1.1% more than Stripe
 * at this stage.
 */
export function getPolar() {
  if (!env.POLAR_ACCESS_TOKEN) {
    throw new AppError('AI_PROVIDER_ERROR', 'POLAR_ACCESS_TOKEN is not configured.')
  }

  return new Polar({
    accessToken: env.POLAR_ACCESS_TOKEN,
    server: env.POLAR_SERVER,
  })
}

export function isBillingConfigured() {
  return Boolean(env.POLAR_ACCESS_TOKEN)
}
