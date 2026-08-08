import { Check } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { eq } from 'drizzle-orm'

import { Cell } from '@/components/ui/horizon'
import { buttonVariants } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import { cn, formatPrice, pickPrice, type Currency } from '@/lib/utils'
import { BRAND_COST, BRAND_COST_STARTER } from '@/server/billing/credits'
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
/**
 * How many brands a plan's credits buy.
 *
 * Customers are sold brands. "20 brands a month" is a number someone can hold
 * in their head and act on; "260 credits" is an internal unit that answers no
 * question they are asking. The credits still run the machine and are still
 * shown — underneath, in smaller type, for anyone who wants to check the
 * arithmetic.
 */
function brandsFor(plan: { monthlyCredits: number; websiteBuilder: boolean; socialMediaKit: boolean }) {
  const full = plan.websiteBuilder && plan.socialMediaKit
  return Math.floor(plan.monthlyCredits / (full ? BRAND_COST : BRAND_COST_STARTER))
}

/** Copy keyed by the plans this product ships. Anything else falls back. */
const POSITIONING: Record<string, 'planFor_free'> = {
  free: 'planFor_free',
  creator: 'planFor_creator' as 'planFor_free',
  pro: 'planFor_pro' as 'planFor_free',
  agency: 'planFor_agency' as 'planFor_free',
}

const CTA: Record<string, 'planCta_free'> = {
  free: 'planCta_free',
  creator: 'planCta_creator' as 'planCta_free',
  pro: 'planCta_pro' as 'planCta_free',
  agency: 'planCta_agency' as 'planCta_free',
}

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
        const featured = plan.slug === 'creator'
        const price = pickPrice(currency, { usd: plan.priceMonthly, aed: plan.priceMonthlyAed })
        const features = (plan.features as Record<string, string[]>)?.[locale] ?? []
        /*
         * The free plan's ten credits buy one kit and no more, so it says that
         * rather than "~1 runs a month" — which reads as a rate for something
         * that happens once.
         */
        const brands = brandsFor(plan)
        const recurring = plan.priceMonthly > 0

        /*
         * Per-plan copy, looked up rather than interpolated into a key.
         *
         * `t('planFor_' + slug)` throws when a slug has no entry, so adding a
         * plan in the admin screen would take the landing page down with it.
         * Falling back keeps an unknown plan rendering — plainly, but
         * rendering.
         */
        const positioning = POSITIONING[plan.slug] ? t(POSITIONING[plan.slug]) : plan.name
        const cta = CTA[plan.slug]
          ? t(CTA[plan.slug])
          : recurring
            ? t('pricingCtaPaid', { plan: plan.name })
            : t('pricingCta')

        return (
          <Cell key={plan.id} index={index}>
            {/*
              The reference marks its recommended plan with one thing: the
              hairline goes solid accent while the other two stay neutral. No
              fill, no size change, no second badge. That is the cheapest
              possible "this one" and it survives being seen at a glance.

              `--lit-radius` moves both this edge and its inner corner to the
              panel step, because a plan card contains cards.
            */}
            <div
              className={cn(
                'h-full [--lit-radius:var(--radius-panel)]',
                featured
                  ? 'relative rounded-panel bg-[image:var(--brand-gradient)] p-px shadow-[0_0_70px_-20px_var(--brand-primary)]'
                  : 'lit',
              )}
            >
              {/*
                Outside the panel, not inside it. The bloom below clips to its
                own box — that is what keeps a radial from bleeding past a
                rounded corner — and this label hangs three pixels above the
                card's top edge, so declared inside it, it lost its top third.
              */}
              {featured && (
                <span className="absolute -top-3 end-6 z-10 rounded-full bg-[image:var(--brand-gradient)] px-3 py-1 text-xs font-semibold text-brand-fg">
                  {t('pricingChosen')}
                </span>
              )}

              {/* Only the recommended plan has a source inside it. The others
                  are the same room with the light off them, which is what makes
                  one of four read as the answer without changing its size. */}
              <div
                className={cn(
                  'lit-inner flex flex-col p-7',
                  featured && 'bloom [--bloom-strength:20%]',
                )}
              >
                <p className="text-sm text-fg-secondary">{plan.name}</p>

                <p className="mt-4 flex items-baseline gap-1.5">
                  <span className="font-display text-5xl font-semibold tracking-[-0.02em]">
                    {plan.priceMonthly === 0
                      ? t('pricingFree')
                      : formatPrice(price.amount, price.currency, locale)}
                  </span>
                  {plan.priceMonthly > 0 && (
                    <span className="text-sm text-fg-muted">{t('pricingPerMonth')}</span>
                  )}
                </p>

                {/*
                  The number that decides the plan, given the whole line.
                  Credits sit under it because they are how the machine is
                  metered, not how the decision is made.
                */}
                <p className="mt-5 rounded-control border border-line bg-elevated/40 px-3.5 py-3">
                  <span className="block font-display text-lg font-semibold">
                    {recurring ? t('planBrandsMonth', { brands }) : t('planOneBrand')}
                  </span>
                  <span className="mt-0.5 block text-xs text-fg-muted">
                    {recurring
                      ? t('planCredits', { credits: plan.monthlyCredits })
                      : t('pricingCreditsOnce', { credits: plan.monthlyCredits })}
                  </span>
                </p>

                {/* What this plan is for, in one line, before the checklist. */}
                <p className="mt-4 text-sm leading-relaxed text-fg-secondary">{positioning}</p>

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
                  className={cn(
                    buttonVariants({
                      variant: featured ? 'primary' : 'outline',
                      shape: 'pill',
                    }),
                    'mt-8 w-full',
                  )}
                >
                  {cta}
                </Link>

                {/* Said only where it is true: the free plan takes no card. */}
                {plan.priceMonthly === 0 && (
                  <p className="mt-3 text-center text-xs text-fg-muted">{t('planNoCard')}</p>
                )}
                {recurring && (
                  <p className="mt-3 text-center text-xs text-fg-muted">{t('planCancel')}</p>
                )}
              </div>
            </div>
          </Cell>
        )
      })}
    </div>
  )
}
