import { Webhooks } from '@polar-sh/nextjs'
import type { NextRequest } from 'next/server'

import { env } from '@/lib/env'
import {
  activateSubscription,
  downgradeToFree,
  markCancelAtPeriodEnd,
  recordOrderAndGrantCredits,
  reverseOrder,
  syncSubscription,
} from '@/server/billing/subscriptions'

/**
 * Polar webhooks — the authoritative source of billing state.
 *
 * The post-checkout redirect is UX only: it is trivially forgeable and fires
 * before payment settles. Credits and access are granted here and nowhere else.
 *
 * The adapter verifies the signature before any handler runs, so an unsigned or
 * tampered payload never reaches these functions.
 */
const handler = Webhooks({
  webhookSecret: env.POLAR_WEBHOOK_SECRET ?? '',

  onSubscriptionCreated: async ({ data }) => {
    await syncSubscription(data as never)
  },
  onSubscriptionActive: async ({ data }) => {
    await activateSubscription(data as never)
  },
  onSubscriptionUpdated: async ({ data }) => {
    await syncSubscription(data as never)
  },
  onSubscriptionCanceled: async ({ data }) => {
    await markCancelAtPeriodEnd(data as never)
  },
  onSubscriptionRevoked: async ({ data }) => {
    await downgradeToFree(data as never)
  },
  onOrderPaid: async ({ data }) => {
    await recordOrderAndGrantCredits(data as never)
  },
  onOrderRefunded: async ({ data }) => {
    await reverseOrder(data as never)
  },
})

export async function POST(request: NextRequest) {
  /*
   * Answer 503 rather than letting the adapter throw a 500 when the secret is
   * missing. Polar retries 5xx deliveries, so a misconfigured deployment would
   * turn every event into an indefinite retry loop, and the 500 would read as a
   * bug in the handlers rather than as absent configuration.
   */
  if (!env.POLAR_WEBHOOK_SECRET) {
    console.error('[billing] POLAR_WEBHOOK_SECRET is not configured; rejecting webhook')
    return Response.json(
      { error: { code: 'BILLING_NOT_CONFIGURED' } },
      { status: 503, headers: { 'Retry-After': '3600' } },
    )
  }

  return handler(request)
}
