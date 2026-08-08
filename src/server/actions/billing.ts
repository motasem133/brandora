'use server'

import { count, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { env } from '@/lib/env'
import { AppError } from '@/lib/errors'
import { orgAction, orgOwnerAction } from '@/server/actions/safe-action'
import { getPolar } from '@/server/billing/polar'
import { syncBillingFromPolar } from '@/server/billing/sync'
import { db } from '@/server/db'
import { getCurrentSubscription, hasLiveSubscription } from '@/server/db/queries/subscriptions'
import { creditPacks, members, plans, subscriptions } from '@/server/db/schema'

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
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    /*
     * Checkout is for someone who has nothing yet.
     *
     * Polar refuses a second subscription for the same customer, so a
     * subscriber sent here met "you already have a subscription" on a payment
     * page after leaving the app. Moving between plans is `changePlan` below,
     * which happens in one request against the card already on file.
     *
     * Credit packs stay here whatever the subscription state: they are one-off
     * orders, not subscriptions.
     */
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

    return { url: checkout.url }
  })

async function resolveProductId(input: { kind: 'plan' | 'pack'; slug: string }) {
  if (input.kind === 'pack') {
    const [pack] = await db
      .select()
      .from(creditPacks)
      .where(eq(creditPacks.slug, input.slug))
      .limit(1)

    return pack?.polarProductId ?? null
  }

  const [plan] = await db.select().from(plans).where(eq(plans.slug, input.slug)).limit(1)

  // Billing is monthly. The yearly column stays in the schema for the data
  // already in it; nothing sells against it.
  return plan?.polarProductIdMonthly ?? null
}

/**
 * Cancels at period end rather than immediately.
 *
 * A customer who has paid for the month keeps what they paid for; revoking
 * access on the spot would be taking money for nothing.
 */
/**
 * Moves an existing subscription to another plan, in place.
 *
 * The first attempt at this sent subscribers to Polar's hosted portal, which
 * works and is wrong: it drops the customer out of the product to change
 * something the product knows how to change, and the portal asks for a payment
 * method they have already given. Every other subscription product in the world
 * does this in one click against the card on file, and so does this one now.
 *
 * Proration is left unset on purpose, so Polar applies whatever the
 * organization configured. Deciding it here would silently override a setting
 * that lives with the pricing, not with this button.
 */
export const changePlan = orgOwnerAction
  .metadata({ name: 'change-plan' })
  .inputSchema(
    z.object({ slug: z.string().min(1) }),
  )
  .action(async ({ parsedInput, ctx }) => {
    /*
     * The subscription that governs, not whichever row the database returned
     * first — an organization that cancelled and subscribed again holds both,
     * and moving the dead one would fail against Polar while the live one
     * carried on billing the old plan.
     */
    const subscription = await getCurrentSubscription(ctx.orgId)

    /*
     * A failed payment loses the plan but not the subscription, so changing
     * plan stays available: it is one of the two things — with fixing the card
     * — that can end the failure.
     */
    if (!subscription?.polarSubscriptionId || !hasLiveSubscription(subscription.status)) {
      throw new AppError('NOT_FOUND', 'There is no active subscription to change.')
    }

    const productId = await resolveProductId({ kind: 'plan', ...parsedInput })

    if (!productId) {
      throw new AppError('VALIDATION', 'This plan is not available for purchase yet.')
    }

    /*
     * A workspace cannot move to a plan with fewer seats than it has people.
     *
     * Refused here rather than absorbed, because this is the only moment where
     * the customer is present and the money has not moved yet. The alternative
     * — take the payment, then decide which teammate to remove — is a choice
     * that belongs to them, not to us.
     *
     * Downgrades that arrive by webhook are a different matter and are left
     * alone: nobody is there to answer, and locking people out of work they
     * made is worse than an over-limit workspace. The Team card says so, and
     * further invitations are blocked until they are back under the limit.
     */
    const [target] = await db
      .select({ seats: plans.seats, name: plans.name })
      .from(plans)
      .where(eq(plans.slug, parsedInput.slug))
      .limit(1)

    if (target && target.seats >= 0) {
      const [memberCount] = await db
        .select({ total: count() })
        .from(members)
        .where(eq(members.organizationId, ctx.orgId))

      const people = memberCount?.total ?? 0
      if (people > target.seats) {
        throw new AppError(
          'VALIDATION',
          `${target.name} includes ${target.seats} seat${target.seats === 1 ? '' : 's'}, and this workspace has ${people} members. Remove ${people - target.seats} before moving to it.`,
        )
      }
    }

    const polar = getPolar()

    try {
      await polar.subscriptions.update({
        id: subscription.polarSubscriptionId,
        subscriptionUpdate: { productId },
      })
    } catch (error) {
      /*
       * The card on file can be declined by the proration charge. That is the
       * one failure the customer can actually act on, and the portal is where
       * a payment method is replaced — so it is the only case that sends them
       * there, and it says why.
       */
      const message = error instanceof Error ? error.message : String(error)

      if (/payment/i.test(message)) {
        throw new AppError(
          'VALIDATION',
          'Your card was declined for the amount due today. Update your payment method and try again.',
        )
      }

      throw error
    }

    /*
     * The webhook writes the authoritative state. Pulling now means the page
     * the customer lands back on already shows the plan they just chose rather
     * than the one they left, however long delivery takes.
     */
    await syncBillingFromPolar(ctx.orgId)
    revalidatePath('/[locale]/dashboard', 'layout')

    return { slug: parsedInput.slug }
  })

export const cancelSubscription = orgOwnerAction
  .metadata({ name: 'cancel-subscription' })
  .inputSchema(z.object({}))
  .action(async ({ ctx }) => {
    const subscription = await getCurrentSubscription(ctx.orgId)

    if (!subscription?.polarSubscriptionId || !hasLiveSubscription(subscription.status)) {
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
