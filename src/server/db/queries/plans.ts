import 'server-only'

import { and, count, eq, gt } from 'drizzle-orm'

import { db } from '@/server/db'
import { invitations, members, plans, type Plan } from '@/server/db/schema'
import { entitles, getCurrentSubscription } from './subscriptions'

/**
 * The plan an organization is currently entitled to.
 *
 * Falls back to the free plan when there is no subscription row, which is the
 * normal state for a new signup rather than an error — and when the row that
 * exists no longer entitles anything. That second case used to be missed: the
 * join asked which plan the subscription pointed at and never asked whether it
 * was still alive, so an organization whose subscription had been revoked for
 * non-payment kept every paid feature indefinitely.
 */
export async function getOrgPlan(organizationId: string): Promise<Plan | null> {
  const subscription = await getCurrentSubscription(organizationId)

  if (subscription && entitles(subscription.status)) {
    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, subscription.planId))
      .limit(1)

    if (plan) return plan
  }

  const [free] = await db.select().from(plans).where(eq(plans.slug, 'free')).limit(1)
  return free ?? null
}

export type Entitlements = {
  planName: string
  websiteBuilder: boolean
  socialMediaKit: boolean
  vectorExport: boolean
  brandAssistant: boolean
  customDomain: boolean
  maxProjects: number
  /** -1 = unlimited, matching `maxProjects`. */
  maxCustomDomains: number
  seats: number
}

export async function getEntitlements(organizationId: string): Promise<Entitlements> {
  const plan = await getOrgPlan(organizationId)

  /* Fallbacks are the free plan's, for an organization with no subscription. */
  return {
    planName: plan?.name ?? 'Free',
    websiteBuilder: plan?.websiteBuilder ?? false,
    socialMediaKit: plan?.socialMediaKit ?? false,
    vectorExport: plan?.vectorExport ?? false,
    brandAssistant: plan?.brandAssistant ?? false,
    customDomain: plan?.customDomain ?? false,
    maxProjects: plan?.maxProjects ?? 1,
    maxCustomDomains: plan?.maxCustomDomains ?? 0,
    seats: plan?.seats ?? 1,
  }
}

/**
 * How many seats a plan grants, as a number a comparison can use.
 *
 * `-1` on the table means unlimited; callers want to compare, not to special-
 * case, so it comes back as a ceiling nobody reaches.
 */
export async function seatsForOrg(organizationId: string): Promise<number> {
  const plan = await getOrgPlan(organizationId)
  const seats = plan?.seats ?? 1
  return seats < 0 ? Number.MAX_SAFE_INTEGER : seats
}

/**
 * Seats granted, and seats already spoken for.
 *
 * Pending invitations count. A seat that someone has been invited into is not
 * free — treating it as free is how an owner sends more invitations than the
 * plan can honour and the last person to accept is the one refused.
 */
export async function seatUsage(organizationId: string) {
  const [seats, [memberCount], [pendingCount]] = await Promise.all([
    seatsForOrg(organizationId),
    db
      .select({ total: count() })
      .from(members)
      .where(eq(members.organizationId, organizationId)),
    db
      .select({ total: count() })
      .from(invitations)
      .where(
        and(
          eq(invitations.organizationId, organizationId),
          eq(invitations.status, 'pending'),
          gt(invitations.expiresAt, new Date()),
        ),
      ),
  ])

  const used = memberCount?.total ?? 0
  const pending = pendingCount?.total ?? 0

  return { seats, used, pending, taken: used + pending }
}
