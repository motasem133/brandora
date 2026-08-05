import 'server-only'

import { desc, eq, sql } from 'drizzle-orm'

import { db } from '@/server/db'
import { subscriptions, type Subscription } from '@/server/db/schema'

/**
 * Statuses that buy the plan.
 *
 * Access ends at the first failed charge: a subscription in `past_due` stops
 * entitling immediately rather than coasting through Polar's retry window. The
 * account, the brands and every credit already granted are untouched, and the
 * plan returns the moment a payment succeeds.
 */
export const ENTITLING_STATUSES = ['active', 'trialing'] as const

export function entitles(status: Subscription['status']) {
  return (ENTITLING_STATUSES as readonly string[]).includes(status)
}

/**
 * Statuses where a subscription still exists at Polar.
 *
 * Wider than `entitles` by exactly one case, and the distinction matters: a
 * customer whose card failed has lost the plan but still has a subscription, so
 * they must be offered a plan change and a way to fix the card — never a fresh
 * checkout, which Polar refuses for a customer who already has one.
 */
export const LIVE_STATUSES = ['active', 'trialing', 'past_due'] as const

export function hasLiveSubscription(status: Subscription['status']) {
  return (LIVE_STATUSES as readonly string[]).includes(status)
}

/**
 * The one subscription that governs an organization.
 *
 * An organization can hold several rows: cancelling and subscribing again
 * creates a second Polar subscription, and the old one is kept for history.
 * Every caller used to take `LIMIT 1` with no ordering, which left it to the
 * database to decide which plan somebody was on — and it decided differently
 * between two runs of the same test, on the same data.
 *
 * The order is now explicit: a subscription that still entitles beats one that
 * does not, then the period that runs longest, then the newest row.
 */
export async function getCurrentSubscription(
  organizationId: string,
): Promise<Subscription | null> {
  const [row] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, organizationId))
    .orderBy(
      sql`case when ${subscriptions.status} in ('active', 'trialing', 'past_due') then 0 else 1 end`,
      desc(sql`coalesce(${subscriptions.currentPeriodEnd}, to_timestamp(0))`),
      desc(subscriptions.createdAt),
    )
    .limit(1)

  return row ?? null
}
