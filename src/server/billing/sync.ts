import 'server-only'

import { eq } from 'drizzle-orm'

import { db } from '@/server/db'
import { organizations } from '@/server/db/schema'
import { getPolar } from './polar'
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

  for (const subscription of subscriptions.result?.items ?? []) {
    if (!belongsToOrg(subscription.metadata)) continue
    await activateSubscription(subscription as never)
    synced++

    if (subscription.customerId) {
      await db
        .update(organizations)
        .set({ polarCustomerId: subscription.customerId })
        .where(eq(organizations.id, organizationId))
    }
  }

  for (const order of orders.result?.items ?? []) {
    if (!belongsToOrg(order.metadata)) continue
    await recordOrderAndGrantCredits(order as never)
    synced++
  }

  return { synced }
}
