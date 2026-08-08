import { Webhooks } from '@polar-sh/nextjs'
import { WebhookVerificationError } from '@polar-sh/sdk/webhooks'
import type { NextRequest } from 'next/server'

import { env } from '@/lib/env'
import { reportError } from '@/lib/observability'
import { PolarPayloadError, parseOrder, parseSubscription } from '@/server/billing/schemas'
import {
  activateSubscription,
  clearScheduledCancellation,
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
 *
 * Each payload is parsed rather than cast. Every one of these used to be
 * `data as never`, which type-checks against any parameter at all — so the one
 * boundary in the product where untrusted data arrives carrying money was also
 * the only place the type system had been switched off. A shape that had moved
 * would have been discovered as an `undefined` inside the credit ledger.
 */
const handler = Webhooks({
  webhookSecret: env.POLAR_WEBHOOK_SECRET ?? '',

  onSubscriptionCreated: async ({ data }) => {
    await syncSubscription(parseSubscription('subscription.created', data))
  },
  onSubscriptionActive: async ({ data }) => {
    await activateSubscription(parseSubscription('subscription.active', data))
  },
  onSubscriptionUpdated: async ({ data }) => {
    await syncSubscription(parseSubscription('subscription.updated', data))
  },
  onSubscriptionCanceled: async ({ data }) => {
    await markCancelAtPeriodEnd(parseSubscription('subscription.canceled', data))
  },
  onSubscriptionUncanceled: async ({ data }) => {
    await clearScheduledCancellation(parseSubscription('subscription.uncanceled', data))
  },
  onSubscriptionRevoked: async ({ data }) => {
    await downgradeToFree(parseSubscription('subscription.revoked', data))
  },
  onOrderPaid: async ({ data }) => {
    await recordOrderAndGrantCredits(parseOrder('order.paid', data))
  },
  onOrderRefunded: async ({ data }) => {
    await reverseOrder(parseOrder('order.refunded', data))
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

  try {
    return await handler(request)
  } catch (error) {
    /*
     * A signature failure is the adapter's own 403 and never reaches here. What
     * does is a payload this SDK version cannot parse: an event type added to
     * Polar since it was published, or a field whose shape moved. Letting that
     * throw answers 500, and Polar reads a 500 as "deliver it again" for days —
     * so an event nothing here could ever act on becomes a permanent retry.
     *
     * It is acknowledged instead, and reported, because the fix is a version
     * bump rather than another delivery. Anything else — a database outage
     * mid-handler — still throws, and those retries are the ones worth having.
     */
    if (error instanceof WebhookVerificationError) throw error

    /*
     * A payload that parsed as a Polar event but does not carry what the
     * handlers need. Same category as the SDK case below and the same answer:
     * redelivering it produces the same payload, so retrying forever buys
     * nothing. Acknowledged and reported, because the fix is code, not another
     * delivery.
     */
    if (error instanceof PolarPayloadError) {
      console.warn(`[billing] ${error.event} payload rejected`, error.issues)
      reportError(error, { source: 'polar-webhook', event: error.event })
      return Response.json({ received: true, handled: false }, { status: 202 })
    }

    const name = error instanceof Error ? error.name : ''
    if (name === 'SDKValidationError') {
      console.warn('[billing] webhook payload not understood by this SDK version', error)
      reportError(error, { source: 'polar-webhook' })
      return Response.json({ received: true, handled: false }, { status: 202 })
    }

    throw error
  }
}
