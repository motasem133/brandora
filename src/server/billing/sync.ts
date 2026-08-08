import 'server-only'

import { eq } from 'drizzle-orm'

import { db } from '@/server/db'
import { organizations } from '@/server/db/schema'
import { getPolar } from './polar'
import { polarOrderSchema, polarSubscriptionSchema } from './schemas'
import { activateSubscription, recordOrderAndGrantCredits } from './subscriptions'

/**
 * Pulls billing state from Polar for one organization.
 *
 * Webhooks remain the primary path, but they are a push mechanism and pushes
 * fail: an endpoint can be unreachable during a deploy, a delivery can be
 * dropped, and in local development Polar cannot reach the machine at all.
 * Without a pull path, a customer who has genuinely paid sits on the old plan
 * with no way to recover except manual intervention.
 *
 * Reuses the webhook handlers rather than duplicating their logic, so the
 * idempotency keys are shared: syncing after a webhook already landed is a
 * no-op rather than a double grant.
 */
export async function syncBillingFromPolar(organizationId: string) {
  const polar = getPolar()

  const [subscriptions, orders] = await Promise.all([
    polar.subscriptions.list({ limit: 100 }),
    polar.orders.list({ limit: 100 }),
  ])

  const belongsToOrg = (metadata: unknown) =>
    typeof metadata === 'object' &&
    metadata !== null &&
    (metadata as Record<string, unknown>).organizationId === organizationId

  let synced = 0
  let skipped = 0

  /*
   * Parsed per item, and a failure skips that item rather than aborting.
   *
   * This is where the pull path differs from the webhook: one delivery is one
   * event, so rejecting it rejects the request. Here a hundred rows are being
   * reconciled at once, and one unparseable subscription must not cost a
   * customer the ninety-nine that were fine — least of all when the reason they
   * pressed sync is that their payment has not been reflected yet.
   */
  for (const raw of subscriptions.result?.items ?? []) {
    if (!belongsToOrg(raw.metadata)) continue

    const subscription = polarSubscriptionSchema.safeParse(raw)
    if (!subscription.success) {
      console.warn('[billing] sync skipped a subscription it could not parse', subscription.error.issues)
      skipped++
      continue
    }

    await activateSubscription(subscription.data)
    synced++

    if (subscription.data.customerId) {
      await db
        .update(organizations)
        .set({ polarCustomerId: subscription.data.customerId })
        .where(eq(organizations.id, organizationId))
    }
  }

  for (const raw of orders.result?.items ?? []) {
    if (!belongsToOrg(raw.metadata)) continue

    const order = polarOrderSchema.safeParse(raw)
    if (!order.success) {
      console.warn('[billing] sync skipped an order it could not parse', order.error.issues)
      skipped++
      continue
    }

    await recordOrderAndGrantCredits(order.data)
    synced++
  }

  return { synced, skipped }
}
