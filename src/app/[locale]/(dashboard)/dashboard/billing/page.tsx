import { desc, eq, inArray } from 'drizzle-orm'
import { Check } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { BillingSync } from '@/components/features/billing/billing-sync'
import { ChangePlanButton } from '@/components/features/billing/change-plan-button'
import { CheckoutButton } from '@/components/features/billing/checkout-button'
import { CancelSubscriptionButton } from '@/components/features/billing/cancel-button'
import { Badge } from '@/components/ui/badge'
import { CurrencySwitch } from '@/components/features/billing/currency-switch'
import { cn, formatDate, formatPrice, isCurrency, pickPrice, type Currency } from '@/lib/utils'
import { db } from '@/server/db'
import { getOrgPlan } from '@/server/db/queries/plans'
import {
  entitles,
  getCurrentSubscription,
  hasLiveSubscription,
} from '@/server/db/queries/subscriptions'
import { creditPacks, creditTransactions, orders, plans, projects } from '@/server/db/schema'
import { requireOrg } from '@/server/session'

/**
 * Money.
 *
 * Rebuilt, because it was the one surface left carrying both compositions this
 * design system bans outright, and two critiques in a row said so: a row of
 * three stat cards across the top, and four plans as four cards of identical
 * size — a shape that asks the reader to compare four things by reading all of
 * them, and gives the plan they are already on no more presence than the one
 * they are not.
 *
 * What replaced them:
 *
 * - **One standing panel.** The two facts a customer opens this page for — what
 *   plan they are on and how many credits they hold — are one sentence about
 *   one account, not two tiles and a third tile of buttons.
 * - **The plans as a ladder.** Rows climb, so the order is the information, and
 *   the row they are on takes the accent hairline. That is the reference's
 *   whole "which one" device, and it survives being seen at a glance.
 * - **A ledger that can be audited.** Every entry now carries its date and the
 *   brand it was spent on. PRODUCT.md's own account — the freelancer running
 *   brand after brand — could not previously tell which client a charge
 *   belonged to.
 */
export default async function BillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ checkout?: string; currency?: string }>
}) {
  const { locale } = await params
  const { checkout, currency: requested } = await searchParams
  setRequestLocale(locale)

  // Arabic readers are almost always billing in the UAE, so default to dirhams
  // there and dollars elsewhere. The switch overrides either way.
  const currency: Currency = isCurrency(requested) ? requested : locale === 'ar' ? 'aed' : 'usd'

  const t = await getTranslations('Billing')
  const { org, orgRole } = await requireOrg()

  const [currentPlan, allPlans, packs, subscription, recentOrders, recentCredits] =
    await Promise.all([
      getOrgPlan(org.id),
      db.select().from(plans).where(eq(plans.isActive, true)).orderBy(plans.sortOrder),
      db
        .select()
        .from(creditPacks)
        .where(eq(creditPacks.isActive, true))
        .orderBy(creditPacks.sortOrder),
      // Deliberately the same resolution the entitlement lookup uses: an
      // organization can hold more than one subscription row, and the page must
      // describe the one that actually governs rather than whichever row came
      // back first.
      getCurrentSubscription(org.id),
      db
        .select()
        .from(orders)
        .where(eq(orders.organizationId, org.id))
        .orderBy(desc(orders.createdAt))
        .limit(10),
      db
        .select()
        .from(creditTransactions)
        .where(eq(creditTransactions.organizationId, org.id))
        .orderBy(desc(creditTransactions.createdAt))
        .limit(10),
    ])

  /*
   * The brands those charges were spent on, resolved in one query rather than
   * one per row. A ledger entry carries a project id and never showed it, which
   * left "Generation −8" as the entire account of where eight credits went.
   */
  const projectIds = [...new Set(recentCredits.map((c) => c.projectId).filter(Boolean))] as string[]
  const spentOn = projectIds.length
    ? new Map(
        (
          await db
            .select({ id: projects.id, name: projects.businessName, title: projects.title })
            .from(projects)
            .where(inArray(projects.id, projectIds))
        ).map((p) => [p.id, p.name || p.title]),
      )
    : new Map<string, string>()

  const isOwner = orgRole === 'owner'

  /*
   * Two different questions, and answering them with one flag was the bug.
   *
   * `isEntitled` is what the customer currently gets; a failed payment ends it
   * at once. `isSubscribed` is whether a subscription still exists at Polar —
   * which it does while the card is being retried — and Polar refuses a second
   * subscription for a customer who has one. So someone in `past_due` is on the
   * free plan and is still offered a plan change rather than a checkout that
   * would turn them away.
   */
  const isEntitled = Boolean(subscription && entitles(subscription.status))
  const isSubscribed = Boolean(subscription && hasLiveSubscription(subscription.status))
  const paymentFailed = subscription?.status === 'past_due'

  return (
    <div className="mx-auto max-w-5xl space-y-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">{t('title')}</h1>
          <p className="mt-1 text-sm text-fg-secondary">{t('subtitle')}</p>
        </div>
        <CurrencySwitch active={currency} />
      </div>

      {/* ----------------------------------------------------------- standing */}
      <section className="lit [--lit-radius:var(--radius-panel)]">
        <div className="lit-inner bloom p-7 sm:p-9 [--bloom-x:82%] [--bloom-strength:16%]">
          <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-7">
            <div>
              <p className="text-sm text-fg-secondary">{t('currentPlan')}</p>
              <p className="mt-1 font-display text-4xl font-semibold tracking-[-0.02em]">
                {currentPlan?.name ?? 'Free'}
              </p>

              {subscription?.status === 'active' && !subscription.cancelAtPeriodEnd && (
                <p className="mt-2 text-sm text-fg-muted">
                  {/* Billing is monthly, and no row has ever been written yearly. */}
                  {t('billedMonthly')}
                  {subscription.currentPeriodEnd
                    ? ` · ${t('renewsOn', { date: formatDate(subscription.currentPeriodEnd, locale) })}`
                    : ''}
                </p>
              )}

              {subscription?.cancelAtPeriodEnd && (
                <Badge tone="warning" className="mt-3">
                  {t('endsOn', {
                    date: subscription.currentPeriodEnd
                      ? formatDate(subscription.currentPeriodEnd, locale)
                      : '—',
                  })}
                </Badge>
              )}

              {/*
                A plan that vanished needs its reason next to it. The card
                failed, the plan stopped, and the one action that restores it is
                a payment method — which lives in Polar's portal, so the link
                goes there.
              */}
              {paymentFailed && (
                <div className="mt-3">
                  <Badge tone="danger">{t('paymentFailed')}</Badge>
                  <p className="mt-2 max-w-[46ch] text-sm text-fg-secondary">
                    {t('paymentFailedBody')}
                  </p>
                </div>
              )}
            </div>

            {/*
              The balance, read against the same base line as the plan name.
              These were two cards saying one thing about one account.
            */}
            <div className="sm:text-end">
              <p className="text-sm text-fg-secondary">{t('creditsLeft')}</p>
              <p className="stat-figure mt-1 text-4xl">{org.creditBalance}</p>
            </div>
          </div>

          <div aria-hidden className="rule-fade my-7" />

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
            {org.polarCustomerId && (
              /*
               * A plain anchor on purpose: /api/portal is a Route Handler that
               * redirects to Polar's hosted portal. next/link would attempt a
               * client-side RSC navigation and never follow the redirect.
               */
              // eslint-disable-next-line @next/next/no-html-link-for-pages
              <a href="/api/portal" className="accent-text hover:underline">
                {t('openPortal')}
              </a>
            )}
            <BillingSync auto={checkout === 'success'} />
            {isOwner && isEntitled && !subscription?.cancelAtPeriodEnd && (
              <CancelSubscriptionButton />
            )}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- plans */}
      <section>
        <h2 className="font-display text-lg font-semibold">{t('plans')}</h2>

        {/*
          A ladder, not a shelf.
          Each plan is a row, the rows climb in price, and the one in force
          takes a solid accent hairline and nothing else — no fill, no size
          change, no second badge beside the one word that names it.
        */}
        <ul className="mt-5 space-y-3">
          {allPlans.map((plan) => {
            const isCurrent = plan.id === currentPlan?.id
            const features = (plan.features as Record<string, string[]>)?.[locale] ?? []

            /* The price for the period on show, resolved once for both the
               headline figure and the confirmation that quotes it. */
            const shownPrice = pickPrice(currency, {
              usd: plan.priceMonthly,
              aed: plan.priceMonthlyAed,
            })

            return (
              <li
                key={plan.id}
                className={cn(
                  'rounded-card border bg-surface/60 p-6 transition-colors',
                  isCurrent ? 'border-brand' : 'border-line hover:border-line-strong',
                )}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-4">
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                    <h3 className="font-display text-xl font-semibold">{plan.name}</h3>
                    {isCurrent && <Badge tone="brand">{t('current')}</Badge>}
                    <p className="text-sm text-fg-secondary">
                      {t('creditsPerMonth', { credits: plan.monthlyCredits })}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <p className="font-display text-2xl font-semibold">
                      {formatPrice(shownPrice.amount, shownPrice.currency, locale)}
                      <span className="text-sm font-normal text-fg-muted">{t('perMonth')}</span>
                    </p>
                    {/* The other currency, so what Polar charges is never a surprise. */}
                    {shownPrice.alternate && (
                      <p className="text-xs text-fg-muted">
                        {t('approx', {
                          price: formatPrice(
                            shownPrice.alternate.amount,
                            shownPrice.alternate.currency,
                            locale,
                          ),
                        })}
                      </p>
                    )}

                    {!isCurrent &&
                      plan.priceMonthly > 0 &&
                      isOwner &&
                      /*
                        A plan is only buyable once it has a Polar product
                        behind it. Offering the button regardless sends the
                        customer to a checkout that refuses them, which reads as
                        a broken payment rather than an unsold option.
                      */
                      (plan.polarProductIdMonthly ? (
                        /*
                          Two different actions wearing similar buttons. Someone
                          with no subscription is buying, and that is a
                          checkout. Someone who already subscribes is moving an
                          existing one against a card already on file, which
                          never needed to leave the app — and "Upgrade" is only
                          true for the first of them anyway, since a change can
                          go either way.
                        */
                        isSubscribed ? (
                          <ChangePlanButton
                            slug={plan.slug}
                            planName={plan.name}
                            price={formatPrice(shownPrice.amount, shownPrice.currency, locale)}
                            label={t('changePlan')}
                            canManageCard={Boolean(org.polarCustomerId)}
                          />
                        ) : (
                          <CheckoutButton kind="plan" slug={plan.slug} label={t('upgrade')} />
                        )
                      ) : (
                        <p className="text-xs text-fg-muted">{t('planUnavailable')}</p>
                      ))}
                  </div>
                </div>

                {features.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-fg-secondary">
                    {features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <Check className="size-3.5 shrink-0 accent-text" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      {/* --------------------------------------------------------------- packs */}
      <section>
        <h2 className="font-display text-lg font-semibold">{t('creditPacks')}</h2>
        <p className="mt-1 text-sm text-fg-secondary">{t('creditPacksBody')}</p>

        {/* One panel of rows rather than three cards of the same size again. */}
        <div className="mt-5 rounded-card border border-line bg-surface/60">
          <ul className="divide-y divide-line">
            {packs.map((pack) => {
              const shown = pickPrice(currency, { usd: pack.price, aed: pack.priceAed })

              return (
                <li key={pack.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <p className="font-display text-lg font-semibold">
                      {pack.credits} {t('credits')}
                    </p>
                    <p className="text-sm text-fg-secondary">
                      {formatPrice(shown.amount, shown.currency, locale)}
                    </p>
                    {shown.alternate && (
                      <p className="text-xs text-fg-muted">
                        {t('approx', {
                          price: formatPrice(
                            shown.alternate.amount,
                            shown.alternate.currency,
                            locale,
                          ),
                        })}
                      </p>
                    )}
                  </div>
                  {isOwner && <CheckoutButton kind="pack" slug={pack.slug} label={t('buy')} />}
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      {/* -------------------------------------------------------------- ledger */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-lg font-semibold">{t('recentActivity')}</h2>
          <div className="mt-5 rounded-card border border-line bg-surface/60 px-6 py-2">
            {recentCredits.length === 0 ? (
              <p className="py-4 text-sm text-fg-secondary">{t('noActivity')}</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {recentCredits.map((entry) => {
                  const brand = entry.projectId ? spentOn.get(entry.projectId) : undefined

                  return (
                    <li key={entry.id} className="flex items-start justify-between gap-4 py-3.5">
                      <div className="min-w-0">
                        <p className="text-fg">{t(`reasons.${entry.reason}`)}</p>
                        {/*
                          Date, and which brand it went on. Without them the
                          ledger could show a customer that credits had left the
                          account and nothing about when or what for.
                        */}
                        <p className="mt-0.5 truncate text-xs text-fg-muted">
                          {formatDate(entry.createdAt, locale)}
                          {brand ? ` · ${brand}` : ''}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 font-medium tabular-nums',
                          entry.amount > 0 ? 'text-success' : 'text-fg',
                        )}
                      >
                        {entry.amount > 0 ? '+' : ''}
                        {entry.amount}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        <div>
          <h2 className="font-display text-lg font-semibold">{t('orders')}</h2>
          <div className="mt-5 rounded-card border border-line bg-surface/60 px-6 py-2">
            {recentOrders.length === 0 ? (
              <p className="py-4 text-sm text-fg-secondary">{t('noOrders')}</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {recentOrders.map((order) => (
                  <li key={order.id} className="flex items-center justify-between gap-4 py-3.5">
                    <span className="text-fg-secondary">{formatDate(order.createdAt, locale)}</span>
                    <span className="flex items-center gap-3">
                      <span className="tabular-nums">
                        {formatPrice(
                          order.amount,
                          isCurrency(order.currency.toLowerCase())
                            ? (order.currency.toLowerCase() as Currency)
                            : 'usd',
                          locale,
                        )}
                      </span>
                      <Badge tone={order.status === 'refunded' ? 'warning' : 'success'}>
                        {t(`orderStatus.${order.status}`)}
                      </Badge>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
