import 'server-only'

import { eq } from 'drizzle-orm'

import { db } from '@/server/db'
import { plans, subscriptions, type Plan } from '@/server/db/schema'

/**
 * The plan an organization is currently entitled to.
 *
 * Falls back to the free plan when there is no subscription row, which is the
 * normal state for a new signup rather than an error.
 */
export async function getOrgPlan(organizationId: string): Promise<Plan | null> {
  const [row] = await db
    .select({ plan: plans })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(eq(subscriptions.organizationId, organizationId))
    .limit(1)

  if (row?.plan) return row.plan

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
