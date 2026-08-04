import { desc, eq } from 'drizzle-orm'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { BillingSync } from '@/components/features/billing/billing-sync'
import { ChangePlanButton } from '@/components/features/billing/change-plan-button'
import { CheckoutButton } from '@/components/features/billing/checkout-button'
import { CancelSubscriptionButton } from '@/components/features/billing/cancel-button'
import { Badge } from '@/components/ui/badge'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { CurrencySwitch } from '@/components/features/billing/currency-switch'
import { IntervalSwitch } from '@/components/features/billing/interval-switch'
import {
  formatDate,
  formatPrice,
  isCurrency,
  isInterval,
  pickPrice,
  yearlySavingPercent,
  type BillingInterval,
  type Currency,
} from '@/lib/utils'
import { db } from '@/server/db'
import { getOrgPlan } from '@/server/db/queries/plans'
import { creditPacks, creditTransactions, orders, plans, subscriptions } from '@/server/db/schema'
import { requireOrg } from '@/server/session'

export default async function BillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ checkout?: string; currency?: string; interval?: string }>
}) {
  const { locale } = await params
  const { checkout, currency: requested, interval: requestedInterval } = await searchParams
  setRequestLocale(locale)

  // Arabic readers are almost always billing in the UAE, so default to dirhams
  // there and dollars elsewhere. The switch overrides either way.
  const currency: Currency = isCurrency(requested) ? requested : locale === 'ar' ? 'aed' : 'usd'

  const t = await getTranslations('Billing')
  const { org, orgRole } = await requireOrg()

  const [currentPlan, allPlans, packs, [subscription], recentOrders, recentCredits] =
    await Promise.all([
      getOrgPlan(org.id),
      db.select().from(plans).where(eq(plans.isActive, true)).orderBy(plans.sortOrder),
      db.select().from(creditPacks).where(eq(creditPacks.isActive, true)).orderBy(creditPacks.sortOrder),
      db.select().from(subscriptions).where(eq(subscriptions.organizationId, org.id)).limit(1),
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

  const isOwner = orgRole === 'owner'

  /*
   * Default to the period the customer is already on, so someone billed
   * yearly opens on yearly figures rather than monthly ones they are not
   * paying. An explicit ?interval= still wins.
   */
  const interval: BillingInterval = isInterval(requestedInterval)
    ? requestedInterval
    : (subscription?.status === 'active' ? subscription.interval : 'monthly')

  /* Anything that already bills recurringly changes plan rather than buys one. */
  const isSubscribed = subscription?.status === 'active' || subscription?.status === 'trialing'

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">{t('title')}</h1>
          <p className="mt-1 text-sm text-fg-secondary">{t('subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <IntervalSwitch active={interval} currency={currency} />
          <CurrencySwitch active={currency} interval={interval} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-fg-secondary">{t('currentPlan')}</p>
          <p className="mt-1 font-display text-2xl font-semibold">{currentPlan?.name ?? 'Free'}</p>
          {subscription?.status === 'active' && !subscription.cancelAtPeriodEnd && (
            <p className="mt-1 text-xs text-fg-muted">
              {t(subscription.interval === 'yearly' ? 'billedYearly' : 'billedMonthly')}
              {subscription.currentPeriodEnd
                ? ` · ${t('renewsOn', { date: formatDate(subscription.currentPeriodEnd, locale) })}`
                : ''}
            </p>
          )}
          {subscription?.cancelAtPeriodEnd && (
            <Badge tone="warning" className="mt-2">
              {t('endsOn', {
                date: subscription.currentPeriodEnd
                  ? formatDate(subscription.currentPeriodEnd, locale)
                  : '—',
              })}
            </Badge>
          )}
        </Card>

        <Card className="p-5">
          <p className="text-sm text-fg-secondary">{t('creditsLeft')}</p>
          <p className="mt-1 font-display text-2xl font-semibold">{org.creditBalance}</p>
        </Card>

        <Card className="flex flex-col justify-between p-5">
          <p className="text-sm text-fg-secondary">{t('manage')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {org.polarCustomerId && (
              /*
               * A plain anchor on purpose: /api/portal is a Route Handler that
               * redirects to Polar's hosted portal. next/link would attempt a
               * client-side RSC navigation and never follow the redirect.
               */
              // eslint-disable-next-line @next/next/no-html-link-for-pages
              <a href="/api/portal" className="text-sm accent-text hover:underline">
                {t('openPortal')}
              </a>
            )}
            {isOwner && subscription?.status === 'active' && !subscription.cancelAtPeriodEnd && (
              <CancelSubscriptionButton />
            )}
            <BillingSync auto={checkout === 'success'} />
          </div>
        </Card>
      </div>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold">{t('plans')}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {allPlans.map((plan) => {
            const isCurrent = plan.id === currentPlan?.id
            const features = (plan.features as Record<string, string[]>)?.[locale] ?? []

            /* The price for the period on show, resolved once for both the
               headline figure and the confirmation that quotes it. */
            const shownPrice = pickPrice(
              currency,
              interval === 'yearly'
                ? { usd: plan.priceYearly, aed: plan.priceYearlyAed }
                : { usd: plan.priceMonthly, aed: plan.priceMonthlyAed },
            )

            return (
              <Card key={plan.id} className={isCurrent ? 'border-brand' : undefined}>
                <div className="flex items-baseline justify-between gap-2">
                  <CardTitle>{plan.name}</CardTitle>
                  {isCurrent && <Badge tone="brand">{t('current')}</Badge>}
                </div>

                {(() => {
                  const yearly = interval === 'yearly'
                  const shown = pickPrice(
                    currency,
                    yearly
                      ? { usd: plan.priceYearly, aed: plan.priceYearlyAed }
                      : { usd: plan.priceMonthly, aed: plan.priceMonthlyAed },
                  )
                  const saving = yearlySavingPercent(plan.priceMonthly, plan.priceYearly)
                  return (
                    <>
                      <p className="mt-2 font-display text-2xl font-semibold">
                        {formatPrice(shown.amount, shown.currency, locale)}
                        <span className="text-sm font-normal text-fg-muted">
                          {yearly ? t('perYear') : t('perMonth')}
                        </span>
                      </p>
                      {yearly && saving !== null && (
                        <Badge tone="success" className="mt-1">
                          {t('savePercent', { percent: saving })}
                        </Badge>
                      )}
                      {/* The other currency, so what Polar charges is never a surprise. */}
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
                    </>
                  )
                })()}
                <p className="mt-1 text-sm text-fg-secondary">
                  {t('creditsPerMonth', { credits: plan.monthlyCredits })}
                </p>

                <ul className="mt-4 space-y-1.5 text-sm text-fg-secondary">
                  {features.map((feature) => (
                    <li key={feature}>· {feature}</li>
                  ))}
                </ul>

                {!isCurrent && plan.priceMonthly > 0 && isOwner && (
                  <div className="mt-4">
                    {/*
                      A plan is only buyable on a period that has a Polar
                      product behind it. Offering the button regardless sends
                      the customer to a checkout that refuses them, which reads
                      as a broken payment rather than an unsold option.
                    */}
                    {(interval === 'yearly'
                      ? plan.polarProductIdYearly
                      : plan.polarProductIdMonthly) ? (
                      /*
                        Two different actions wearing similar buttons. Someone
                        with no subscription is buying, and that is a checkout.
                        Someone who already subscribes is moving an existing one
                        against a card already on file, which never needed to
                        leave the app — and "Upgrade" is only true for the
                        first of them anyway, since a change can go either way.
                      */
                      isSubscribed ? (
                        <ChangePlanButton
                          slug={plan.slug}
                          planName={plan.name}
                          price={formatPrice(shownPrice.amount, shownPrice.currency, locale)}
                          interval={interval}
                          label={t('changePlan')}
                          canManageCard={Boolean(org.polarCustomerId)}
                        />
                      ) : (
                        <CheckoutButton
                          kind="plan"
                          slug={plan.slug}
                          interval={interval}
                          label={t('upgrade')}
                        />
                      )
                    ) : (
                      <p className="text-xs text-fg-muted">{t('intervalUnavailable')}</p>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold">{t('creditPacks')}</h2>
          <p className="text-sm text-fg-secondary">{t('creditPacksBody')}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {packs.map((pack) => (
            <Card key={pack.id} className="flex items-center justify-between gap-4 p-5">
              <div>
                <p className="font-display font-semibold">{pack.credits} {t('credits')}</p>
                {(() => {
                  const shown = pickPrice(currency, { usd: pack.price, aed: pack.priceAed })
                  return (
                    <>
                      <p className="text-sm text-fg-secondary">
                        {formatPrice(shown.amount, shown.currency, locale)}
                      </p>
                      {shown.alternate && (
                        <p className="text-xs text-fg-muted">
                          {t('approx', {
                            price: formatPrice(shown.alternate.amount, shown.alternate.currency, locale),
                          })}
                        </p>
                      )}
                    </>
                  )
                })()}
              </div>
              {isOwner && <CheckoutButton kind="pack" slug={pack.slug} label={t('buy')} />}
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-3">
          <CardTitle>{t('recentActivity')}</CardTitle>
          {recentCredits.length === 0 ? (
            <CardDescription>{t('noActivity')}</CardDescription>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {recentCredits.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-fg-secondary">{t(`reasons.${entry.reason}`)}</span>
                  <span className={entry.amount > 0 ? 'text-success' : 'text-fg'}>
                    {entry.amount > 0 ? '+' : ''}
                    {entry.amount}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="space-y-3">
          <CardTitle>{t('orders')}</CardTitle>
          {recentOrders.length === 0 ? (
            <CardDescription>{t('noOrders')}</CardDescription>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {recentOrders.map((order) => (
                <li key={order.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-fg-secondary">
                    {formatDate(order.createdAt, locale)}
                  </span>
                  <span className="flex items-center gap-2">
                    {formatPrice(order.amount, isCurrency(order.currency.toLowerCase()) ? (order.currency.toLowerCase() as Currency) : 'usd', locale)}
                    <Badge tone={order.status === 'refunded' ? 'warning' : 'success'}>
                      {t(`orderStatus.${order.status}`)}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
