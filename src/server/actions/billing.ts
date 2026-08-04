'use server'

import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { env } from '@/lib/env'
import { AppError } from '@/lib/errors'
import { orgAction, orgOwnerAction } from '@/server/actions/safe-action'
import { getPolar } from '@/server/billing/polar'
import { syncBillingFromPolar } from '@/server/billing/sync'
import { db } from '@/server/db'
import { creditPacks, plans, subscriptions } from '@/server/db/schema'

/**
 * Creates a Polar checkout session.
 *
 * `organizationId` goes into checkout metadata so the webhook can attribute the
 * resulting subscription or order without trusting anything the browser sends
 * back afterwards.
 */
export const createCheckout = orgAction
  .metadata({ name: 'create-checkout' })
  .inputSchema(
    z.object({
      kind: z.enum(['plan', 'pack']),
      slug: z.string().min(1),
      interval: z.enum(['monthly', 'yearly']).default('monthly'),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    /*
     * A customer who already subscribes cannot be sent to a fresh checkout.
     *
     * Polar refuses a second subscription for the same customer, and the
     * refusal surfaces at its own hosted page as "you already have a
     * subscription" — after the customer has left the app, believing they were
     * buying something. Changing plans is an update, not a purchase, and the
     * hosted portal is where Polar performs it, with the proration it owes
     * them.
     *
     * Credit packs are exempt: they are one-off orders, not subscriptions, so
     * buying one while subscribed is exactly what should happen.
     */
    if (parsedInput.kind === 'plan') {
      const [existing] = await db
        .select({ status: subscriptions.status })
        .from(subscriptions)
        .where(eq(subscriptions.organizationId, ctx.orgId))
        .limit(1)

      if (existing?.status === 'active' || existing?.status === 'trialing') {
        return { url: `${env.NEXT_PUBLIC_APP_URL}/api/portal`, isPlanChange: true }
      }
    }

    const productId = await resolveProductId(parsedInput)

    if (!productId) {
      throw new AppError(
        'VALIDATION',
        'This product is not available for purchase yet. Connect it in Polar first.',
      )
    }

    const polar = getPolar()

    const base = {
      products: [productId],
      successUrl: `${env.NEXT_PUBLIC_APP_URL}/en/dashboard/billing?checkout=success`,
      // Read back by the webhook — never trusted from the redirect.
      metadata: {
        organizationId: ctx.orgId,
        userId: ctx.user.id,
      },
    }

    /*
     * Prefilling the email saves the customer a field, but Polar validates the
     * domain with an MX lookup and rejects anything that cannot receive mail.
     * Our own sign-up accepts such addresses, so a prefill failure must not
     * block the purchase — fall back to letting Polar collect the address.
     */
    let checkout
    try {
      checkout = await polar.checkouts.create({ ...base, customerEmail: ctx.user.email })
    } catch (error) {
      console.warn('[billing] checkout with prefilled email failed, retrying without', error)
      checkout = await polar.checkouts.create(base)
    }

    return { url: checkout.url, isPlanChange: false }
  })

async function resolveProductId(input: {
  kind: 'plan' | 'pack'
  slug: string
  interval: 'monthly' | 'yearly'
}) {
  if (input.kind === 'pack') {
    const [pack] = await db
      .select()
      .from(creditPacks)
      .where(eq(creditPacks.slug, input.slug))
      .limit(1)

    return pack?.polarProductId ?? null
  }

  const [plan] = await db.select().from(plans).where(eq(plans.slug, input.slug)).limit(1)
  if (!plan) return null

  return input.interval === 'yearly' ? plan.polarProductIdYearly : plan.polarProductIdMonthly
}

/**
 * Cancels at period end rather than immediately.
 *
 * A customer who has paid for the month keeps what they paid for; revoking
 * access on the spot would be taking money for nothing.
 */
export const cancelSubscription = orgOwnerAction
  .metadata({ name: 'cancel-subscription' })
  .inputSchema(z.object({}))
  .action(async ({ ctx }) => {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, ctx.orgId))
      .limit(1)

    if (!subscription?.polarSubscriptionId) {
      throw new AppError('NOT_FOUND', 'There is no active subscription to cancel.')
    }

    const polar = getPolar()
    await polar.subscriptions.update({
      id: subscription.polarSubscriptionId,
      subscriptionUpdate: { cancelAtPeriodEnd: true },
    })

    // The webhook writes the authoritative state; this is an optimistic echo so
    // the UI reflects the change without waiting for delivery.
    await db
      .update(subscriptions)
      .set({ cancelAtPeriodEnd: true, canceledAt: new Date(), updatedAt: new Date() })
      .where(eq(subscriptions.id, subscription.id))

    return { cancelAtPeriodEnd: true }
  })


/**
 * Reconciles this organization's billing against Polar.
 *
 * Runs automatically when returning from checkout, and is available manually,
 * so a missed webhook never leaves a paying customer on the wrong plan.
 */
export const syncBilling = orgAction
  .metadata({ name: 'sync-billing' })
  .inputSchema(z.object({}))
  .action(async ({ ctx }) => {
    const result = await syncBillingFromPolar(ctx.orgId)
    return result
  })
