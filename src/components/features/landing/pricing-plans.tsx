import { Check } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { eq } from 'drizzle-orm'

import { Cell } from '@/components/features/landing/horizon'
import { Link } from '@/i18n/navigation'
import { formatPrice, pickPrice, type Currency } from '@/lib/utils'
import { CREDIT_COSTS } from '@/server/billing/credits'
import { db } from '@/server/db'
import { plans } from '@/server/db/schema'

/**
 * The plan ladder, from the table that bills for it.
 *
 * There were two of these: the landing page rendered a hand-written constant
 * and the pricing page read the database, in different type, in different
 * shapes, with different feature lists — so the two pages could disagree about
 * what a plan includes, and did. A visitor comparing them saw two products.
 *
 * The credits and the runs are derived rather than restated: a run is what the
 * full kit costs, so "about 15 runs a month" is arithmetic on the plan's own
 * monthly credits, and cannot drift from the number the customer is granted.
 */
const FULL_RUN =
  CREDIT_COSTS.branding + CREDIT_COSTS.logos + CREDIT_COSTS.website + CREDIT_COSTS.social

export async function PricingPlans({
  locale,
  currency = 'usd',
}: {
  locale: string
  currency?: Currency
}) {
  const t = await getTranslations('Landing')
  const rows = await db.select().from(plans).where(eq(plans.isActive, true)).orderBy(plans.sortOrder)

  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
      {rows.map((plan, index) => {
        /* The plan the product recommends, marked once. */
        const featured = plan.slug === 'pro'
        const price = pickPrice(currency, { usd: plan.priceMonthly, aed: plan.priceMonthlyAed })
        const features = (plan.features as Record<string, string[]>)?.[locale] ?? []
        /*
         * The free plan's ten credits buy one kit and no more, so it says that
         * rather than "~1 runs a month" — which reads as a rate for something
         * that happens once.
         */
        const runs = Math.floor(plan.monthlyCredits / FULL_RUN)
        const recurring = plan.priceMonthly > 0

        return (
          <Cell key={plan.id} index={index}>
            <div
              className={
                featured
                  ? 'relative h-full rounded-panel bg-[image:var(--brand-gradient)] p-px shadow-[0_0_70px_-20px_var(--brand-indigo)]'
                  : 'h-full rounded-panel bg-[image:linear-gradient(180deg,color-mix(in_srgb,var(--text-accent)_28%,transparent),color-mix(in_srgb,var(--text-primary)_5%,transparent)_40%)] p-px'
              }
            >
              <div className="flex h-full flex-col rounded-[calc(var(--radius-panel)-1px)] bg-surface p-7">
                {featured && (
                  <span className="absolute -top-3 end-6 rounded-full bg-[image:var(--brand-gradient)] px-3 py-1 text-xs font-semibold text-brand-fg">
                    {t('pricingChosen')}
                  </span>
                )}

                <p className="text-sm text-fg-secondary">{plan.name}</p>

                <p className="mt-4 flex items-baseline gap-1.5">
                  <span className="font-display text-5xl font-bold tracking-[-0.04em]">
                    {plan.priceMonthly === 0
                      ? t('pricingFree')
                      : formatPrice(price.amount, price.currency, locale)}
                  </span>
                  {plan.priceMonthly > 0 && (
                    <span className="text-sm text-fg-muted">{t('pricingPerMonth')}</span>
                  )}
                </p>

                {/* The number that actually decides the plan. */}
                <p className="mt-5 rounded-control border border-line bg-elevated/40 px-3.5 py-2.5 text-sm">
                  <span className="font-semibold">
                    {recurring && runs > 1 ? t('planRuns', { runs }) : t('planOneBrand')}
                  </span>
                  <span className="text-fg-muted">
                    {' · '}
                    {recurring
                      ? t('planCredits', { credits: plan.monthlyCredits })
                      : t('pricingCreditsOnce', { credits: plan.monthlyCredits })}
                  </span>
                </p>

                <ul className="mt-6 flex-1 space-y-3">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 accent-text" />
                      <span className="text-fg-secondary">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/register"
                  className={
                    featured
                      ? 'mt-8 flex items-center justify-center rounded-full bg-[image:var(--brand-gradient)] py-3 text-sm font-semibold text-brand-fg transition-transform duration-200 hover:scale-[1.02]'
                      : 'mt-8 flex items-center justify-center rounded-full border border-line-strong bg-elevated/50 py-3 text-sm font-medium transition-colors hover:bg-elevated'
                  }
                >
                  {plan.priceMonthly === 0
                    ? t('pricingCta')
                    : t('pricingCtaPaid', { plan: plan.name })}
                </Link>
              </div>
            </div>
          </Cell>
        )
      })}
    </div>
  )
}
