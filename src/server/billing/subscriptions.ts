import 'server-only'

import { eq } from 'drizzle-orm'

import { db } from '@/server/db'
import { entitles } from '@/server/db/queries/subscriptions'
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
  refundedAmount?: number
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

  /*
   * Metadata is trusted for attribution but not for existence. An account can
   * be deleted while Polar still holds events that name it, and inserting
   * against a missing organization fails the foreign key — which answers 500,
   * which Polar reads as "try again", forever. Confirming the row exists turns
   * that into an event that is acknowledged and ignored.
   */
  if (typeof fromMetadata === 'string') {
    const [existing] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.id, fromMetadata))
      .limit(1)

    if (existing) return existing.id

    console.warn(`[billing] metadata names organization ${fromMetadata}, which no longer exists`)
  }

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

/**
 * The plan a Polar product belongs to, and the period it is sold on.
 *
 * Which of the two columns matched is the only trustworthy source for the
 * interval: a customer can switch period in Polar's portal without the app
 * ever seeing the click, and the next webhook simply arrives carrying the
 * other product.
 */
async function findPlanByProduct(productId?: string) {
  if (!productId) return null

  const [monthly] = await db
    .select()
    .from(plans)
    .where(eq(plans.polarProductIdMonthly, productId))
    .limit(1)

  if (monthly) return { plan: monthly, interval: 'monthly' as const }

  const [yearly] = await db
    .select()
    .from(plans)
    .where(eq(plans.polarProductIdYearly, productId))
    .limit(1)

  return yearly ? { plan: yearly, interval: 'yearly' as const } : null
}

/**
 * What one billing period of a plan is worth.
 *
 * Plans price credits per month because that is how they are sold, so a yearly
 * period is twelve of them — granted together, because the yearly period is
 * granted once. Reading the monthly figure directly, as this used to, gave an
 * annual subscriber one month of credits for a year of payment.
 */
function creditsForPeriod(plan: { monthlyCredits: number }, interval: 'monthly' | 'yearly') {
  return interval === 'yearly' ? plan.monthlyCredits * 12 : plan.monthlyCredits
}

/** Creates or updates the subscription row from a Polar subscription object. */
export async function syncSubscription(data: PolarSubscription) {
  const organizationId = await resolveOrganizationId(data.metadata, data.customerId)
  if (!organizationId) {
    console.warn(`[billing] subscription ${data.id} has no resolvable organization`)
    return
  }

  const matched = await findPlanByProduct(data.productId)
  if (!matched) {
    console.warn(`[billing] no plan matches Polar product ${data.productId}`)
    return
  }

  const { plan, interval } = matched

  // Read before the upsert overwrites it: moving to a bigger plan mid-period
  // is only visible as a difference between what was there and what arrives.
  const [previous] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.polarSubscriptionId, data.id))
    .limit(1)

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
    interval,
    currentPeriodStart: toDate(data.currentPeriodStart),
    currentPeriodEnd: toDate(data.currentPeriodEnd),
    cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
    updatedAt: new Date(),
  }

  await db
    .insert(subscriptions)
    .values(values)
    .onConflictDoUpdate({ target: subscriptions.polarSubscriptionId, set: values })

  /*
   * A plan change mid-period is charged immediately — Polar prorates the
   * difference against the card on file — so the credits it bought have to
   * arrive immediately too. Only the difference is granted: the period's own
   * grant already covered the plan they are leaving.
   *
   * Keying on the plan being moved *to* is what stops this being a source of
   * free credits. Someone hopping Pro → Business → Pro → Business pays the
   * proration each time but re-uses the same key, so the top-up happens once.
   * A downgrade grants nothing and claws nothing back: they keep what the
   * period already gave them, which is what they paid for.
   */
  if (previous && previous.planId !== plan.id && entitles(status)) {
    const [previousPlan] = await db.select().from(plans).where(eq(plans.id, previous.planId)).limit(1)

    const difference =
      creditsForPeriod(plan, interval) -
      (previousPlan ? creditsForPeriod(previousPlan, previous.interval) : 0)

    if (difference > 0) {
      const periodKey = toDate(data.currentPeriodStart)?.toISOString() ?? data.id

      await writeLedgerEntry({
        organizationId,
        amount: difference,
        reason: 'subscription_grant',
        idempotencyKey: `sub-change:${data.id}:${periodKey}:${plan.id}`,
        metadata: {
          planSlug: plan.slug,
          fromPlanSlug: previousPlan?.slug ?? null,
          polarSubscriptionId: data.id,
          kind: 'plan-change',
        },
      })
    }
  }

  return { organizationId, plan, interval, status }
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
    amount: creditsForPeriod(synced.plan, synced.interval),
    reason: 'subscription_grant',
    idempotencyKey: `sub-grant:${data.id}:${periodKey}`,
    metadata: {
      planSlug: synced.plan.slug,
      polarSubscriptionId: data.id,
      interval: synced.interval,
    },
  })
}

/**
 * Access ends.
 *
 * The status is what withdraws the plan — `getOrgPlan` only honours a
 * subscription that still entitles, so a revoked row falls back to free.
 *
 * Credits already granted are deliberately left alone. They were granted for a
 * period the customer paid for, and taking back what is left of them at the
 * moment access lapses would be reclaiming something already bought; whatever
 * they still hold is spendable on the free plan's own terms.
 */
export async function downgradeToFree(data: PolarSubscription) {
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

/**
 * Reverses a scheduled cancellation.
 *
 * Polar sends this when someone changes their mind in the portal. Without a
 * handler the app kept believing in the cancellation it had been told about and
 * went on showing "Ends <date>" to a customer who had un-cancelled — until some
 * later, unrelated update happened to carry the flag back.
 */
export async function clearScheduledCancellation(data: PolarSubscription) {
  await db
    .update(subscriptions)
    .set({ cancelAtPeriodEnd: false, canceledAt: null, updatedAt: new Date() })
    .where(eq(subscriptions.polarSubscriptionId, data.id))

  await syncSubscription(data)
}

/** Records a paid order and, for credit packs, grants the credits it bought. */
export async function recordOrderAndGrantCredits(data: PolarOrder) {
  const organizationId = await resolveOrganizationId(data.metadata, data.customerId)
  if (!organizationId) {
    console.warn(`[billing] order ${data.id} has no resolvable organization`)
    return
  }

  /*
   * What the customer was charged, which is the total including tax — that is
   * the figure on their card statement and the only one they can reconcile the
   * payment history against. `net_amount` is what reaches the business after
   * tax, and recording it here made every receipt in the product understate the
   * charge.
   */
  const amount = data.totalAmount ?? data.netAmount ?? data.amount ?? 0

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

/**
 * Reverses a refund with a compensating ledger entry, in proportion.
 *
 * Polar sends this event for a partial refund as well as a full one, and the
 * amount refunded is in the payload. Taking the whole pack back regardless —
 * which is what this did — charged a customer refunded a quarter of their
 * money the entire thousand credits.
 */
export async function reverseOrder(data: PolarOrder) {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.polarOrderId, data.id))
    .limit(1)

  if (!order) return

  const charged = data.totalAmount ?? data.netAmount ?? data.amount ?? order.amount
  const refunded = data.refundedAmount ?? charged
  const isFull = charged <= 0 || refunded >= charged

  await db
    .update(orders)
    // A partially refunded order is still a payment the customer made and can
    // see; only a full refund stops it being one.
    .set({ status: isFull ? 'refunded' : 'paid' })
    .where(eq(orders.polarOrderId, data.id))

  const [pack] = data.productId
    ? await db
        .select()
        .from(creditPacks)
        .where(eq(creditPacks.polarProductId, data.productId))
        .limit(1)
    : []

  if (!pack) return

  const share = isFull ? pack.credits : Math.round(pack.credits * (refunded / charged))
  if (share <= 0) return

  await writeLedgerEntry({
    organizationId: order.organizationId,
    amount: -share,
    reason: 'refund',
    polarOrderId: data.id,
    // Scoped to how much has been refunded so far, so a second, larger refund
    // on the same order still reverses — while a redelivery of this one does
    // not.
    idempotencyKey: `order-reverse:${data.id}:${refunded}`,
    metadata: { packSlug: pack.slug, reversal: true, refunded, charged },
    // A customer may have spent the credits before refunding. Blocking the
    // reversal would leave the ledger claiming they still own what they were
    // refunded for; a negative balance is the honest state, and simply means
    // they must top up before generating again.
    allowNegative: true,
  })
}
