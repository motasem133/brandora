import 'server-only'

import { eq } from 'drizzle-orm'

import { db } from '@/server/db'
import { creditPacks, plans, type CreditPack, type Plan } from '@/server/db/schema'
import { entitles, getCurrentSubscription } from './subscriptions'

/**
 * The plan ladder as a customer sees it.
 *
 * Four surfaces render this list — the landing page, the pricing page, the
 * billing page and the plan comparison — and all four used to spell the same
 * `select … where isActive … orderBy sortOrder` out for themselves, two of them
 * from inside a component. One of them forgetting the `isActive` filter is a
 * retired plan back on sale, so the filter lives here once.
 */
export async function getActivePlans(): Promise<Plan[]> {
  return db.select().from(plans).where(eq(plans.isActive, true)).orderBy(plans.sortOrder)
}

/** Every plan including retired ones. Admin only: this is the editing surface. */
export async function getAllPlans(): Promise<Plan[]> {
  return db.select().from(plans).orderBy(plans.sortOrder)
}

export async function getActiveCreditPacks(): Promise<CreditPack[]> {
  return db
    .select()
    .from(creditPacks)
    .where(eq(creditPacks.isActive, true))
    .orderBy(creditPacks.sortOrder)
}

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
}

export async function getEntitlements(organizationId: string): Promise<Entitlements> {
  const plan = await getOrgPlan(organizationId)

  return {
    planName: plan?.name ?? 'Free',
    websiteBuilder: plan?.websiteBuilder ?? false,
    socialMediaKit: plan?.socialMediaKit ?? false,
    vectorExport: plan?.vectorExport ?? false,
    brandAssistant: plan?.brandAssistant ?? false,
    customDomain: plan?.customDomain ?? false,
    maxProjects: plan?.maxProjects ?? 3,
  }
}
