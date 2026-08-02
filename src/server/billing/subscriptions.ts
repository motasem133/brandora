import 'server-only'

import { eq } from 'drizzle-orm'

import { db } from '@/server/db'
import { creditPacks, orders, organizations, plans, subscriptions } from '@/server/db/schema'
import { writeLedgerEntry } from './credits'

/**
 * Webhook-driven billing state.
 *
 * Every handler here is idempotent. Polar retries deliveries, and a redelivered
 * event must not grant credits twice — so credit movements carry an
 * idempotency key derived from the Polar object that caused them.
 */

type PolarSubscription = {
  id: string
  status: string
  productId?: string
  currentPeriodStart?: string | Date | null
  currentPeriodEnd?: string | Date | null
  cancelAtPeriodEnd?: boolean
  customerId?: string
  metadata?: Record<string, unknown> | null
}

type PolarOrder = {
  id: string
  amount?: number
  netAmount?: number
  totalAmount?: number
  taxAmount?: number
  currency?: string
  productId?: string
  customerId?: string
  metadata?: Record<string, unknown> | null
}

function toDate(value: string | Date | null | undefined) {
  if (!value) return null
  return value instanceof Date ? value : new Date(value)
}

/**
 * Resolves which organization an event belongs to.
 *
 * Checkout metadata is the primary link because we set it ourselves; the Polar
 * customer id is the fallback for events that originate outside a checkout we
 * started, such as a portal-initiated cancellation.
 */
async function resolveOrganizationId(
  metadata: Record<string, unknown> | null | undefined,
  customerId?: string,
): Promise<string | null> {
  const fromMetadata = metadata?.organizationId
  if (typeof fromMetadata === 'string') return fromMetadata

  if (customerId) {
    const [org] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.polarCustomerId, customerId))
      .limit(1)

    if (org) return org.id
  }

  return null
}

async function findPlanByProduct(productId?: string) {
  if (!productId) return null

  const [monthly] = await db
    .select()
    .from(plans)
    .where(eq(plans.polarProductIdMonthly, productId))
    .limit(1)

  if (monthly) return monthly

  const [yearly] = await db
    .select()
    .from(plans)
    .where(eq(plans.polarProductIdYearly, productId))
    .limit(1)

  return yearly ?? null
}

/** Creates or updates the subscription row from a Polar subscription object. */
export async function syncSubscription(data: PolarSubscription) {
  const organizationId = await resolveOrganizationId(data.metadata, data.customerId)
  if (!organizationId) {
    console.warn(`[billing] subscription ${data.id} has no resolvable organization`)
    return
  }

  const plan = await findPlanByProduct(data.productId)
  if (!plan) {
    console.warn(`[billing] no plan matches Polar product ${data.productId}`)
    return
  }

  if (data.customerId) {
    await db
      .update(organizations)
      .set({ polarCustomerId: data.customerId })
      .where(eq(organizations.id, organizationId))
  }

  const status = mapStatus(data.status)

  const values = {
    organizationId,
    planId: plan.id,
    polarSubscriptionId: data.id,
    status,
    currentPeriodStart: toDate(data.currentPeriodStart),
    currentPeriodEnd: toDate(data.currentPeriodEnd),
    cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
    updatedAt: new Date(),
  }

  await db
    .insert(subscriptions)
    .values(values)
    .onConflictDoUpdate({ target: subscriptions.polarSubscriptionId, set: values })

  return { organizationId, plan, status }
}

function mapStatus(status: string) {
  switch (status) {
    case 'active':
      return 'active' as const
    case 'trialing':
      return 'trialing' as const
    case 'past_due':
      return 'past_due' as const
    case 'canceled':
      return 'canceled' as const
    default:
      return 'revoked' as const
  }
}

/**
 * Activates a subscription and grants its period credits.
 *
 * The idempotency key is scoped to the billing period, so a redelivered
 * activation grants nothing while a genuine renewal — a new period — grants
 * again.
 */
export async function activateSubscription(data: PolarSubscription) {
  const synced = await syncSubscription(data)
  if (!synced) return

  const periodKey = toDate(data.currentPeriodStart)?.toISOString() ?? data.id

  await writeLedgerEntry({
    organizationId: synced.organizationId,
    amount: synced.plan.monthlyCredits,
    reason: 'subscription_grant',
    idempotencyKey: `sub-grant:${data.id}:${periodKey}`,
    metadata: { planSlug: synced.plan.slug, polarSubscriptionId: data.id },
  })
}

/** Access ends: unused grant credits expire, purchased packs survive. */
export async function downgradeToFree(data: PolarSubscription) {
  const organizationId = await resolveOrganizationId(data.metadata, data.customerId)
  if (!organizationId) return

  await db
    .update(subscriptions)
    .set({ status: 'revoked', updatedAt: new Date() })
    .where(eq(subscriptions.polarSubscriptionId, data.id))
}

export async function markCancelAtPeriodEnd(data: PolarSubscription) {
  await db
    .update(subscriptions)
    .set({ cancelAtPeriodEnd: true, canceledAt: new Date(), updatedAt: new Date() })
    .where(eq(subscriptions.polarSubscriptionId, data.id))
}

/** Records a paid order and, for credit packs, grants the credits it bought. */
export async function recordOrderAndGrantCredits(data: PolarOrder) {
  const organizationId = await resolveOrganizationId(data.metadata, data.customerId)
  if (!organizationId) {
    console.warn(`[billing] order ${data.id} has no resolvable organization`)
    return
  }

  const amount = data.netAmount ?? data.totalAmount ?? data.amount ?? 0

  await db
    .insert(orders)
    .values({
      organizationId,
      polarOrderId: data.id,
      amount,
      taxAmount: data.taxAmount ?? 0,
      currency: (data.currency ?? 'usd').toUpperCase(),
      status: 'paid',
    })
    .onConflictDoNothing({ target: orders.polarOrderId })

  if (!data.productId) return

  const [pack] = await db
    .select()
    .from(creditPacks)
    .where(eq(creditPacks.polarProductId, data.productId))
    .limit(1)

  // Subscription orders are handled by the subscription events, which know the
  // billing period. Only one-off packs grant credits here.
  if (!pack) return

  await writeLedgerEntry({
    organizationId,
    amount: pack.credits,
    reason: 'purchase',
    polarOrderId: data.id,
    idempotencyKey: `order-grant:${data.id}`,
    metadata: { packSlug: pack.slug },
  })
}

/** Reverses a refunded order with a compensating ledger entry. */
export async function reverseOrder(data: PolarOrder) {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.polarOrderId, data.id))
    .limit(1)

  if (!order) return

  await db
    .update(orders)
    .set({ status: 'refunded' })
    .where(eq(orders.polarOrderId, data.id))

  const [pack] = data.productId
    ? await db
        .select()
        .from(creditPacks)
        .where(eq(creditPacks.polarProductId, data.productId))
        .limit(1)
    : []

  if (!pack) return

  await writeLedgerEntry({
    organizationId: order.organizationId,
    amount: -pack.credits,
    reason: 'refund',
    polarOrderId: data.id,
    idempotencyKey: `order-reverse:${data.id}`,
    metadata: { packSlug: pack.slug, reversal: true },
    // A customer may have spent the credits before refunding. Blocking the
    // reversal would leave the ledger claiming they still own what they were
    // refunded for; a negative balance is the honest state, and simply means
    // they must top up before generating again.
    allowNegative: true,
  })
}
