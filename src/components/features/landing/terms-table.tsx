import { getTranslations } from 'next-intl/server'
import { eq } from 'drizzle-orm'

import { Link } from '@/i18n/navigation'
import { formatPrice, pickPrice, type Currency } from '@/lib/utils'
import { brandsFrom } from '@/server/billing/credits'
import { db } from '@/server/db'
import { plans } from '@/server/db/schema'

/**
 * The plan ladder, set as printed terms rather than as four cards.
 *
 * One table for both documents. `/pricing` renders this same component with the
 * currency it was asked for, so the book and its appendix cannot disagree about
 * a price. The four-card ladder that used to stand there is deleted rather than
 * restyled: two compositions of one set of figures is how they drift apart.
 *
 * Four cards in a row, the second one scaled up, ringed in the product's accent
 * and badged "Recommended", is the single most reproduced block on the web. It
 * is not a bad pattern, it is an anonymous one, and it was the loudest thing on
 * a page whose whole argument is that this product makes work that does not look
 * like everyone else's. A brand book does not have a pricing grid. It has a
 * terms page: rows, rules, and figures aligned on the decimal.
 *
 * The recommendation survives, marked the way print marks things, a rule that
 * goes solid and a word set in the margin, rather than with a fill, a glow and
 * a floating pill.
 */

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

export async function TermsTable({
  locale,
  currency = 'usd',
}: {
  locale: string
  currency?: Currency
}) {
  const t = await getTranslations('Landing')
  const rows = await db.select().from(plans).where(eq(plans.isActive, true)).orderBy(plans.sortOrder)

  return (
    <div>
      {/*
        A real <table>, because this is one.

        The grid it replaces was four <div>s, so a screen reader met four
        unrelated groups and no way to compare a figure in one against the same
        figure in another. Four rows with headers means "what does Pro cost"
        is one navigation instead of a hunt.
      */}
      <table className="w-full border-collapse text-start">
        <caption className="sr-only">{t('pricingHeading')}</caption>
        <thead>
          <tr className="border-b border-line-strong">
            <th scope="col" className="type-runhead pb-3 text-start">
              {t('termsColPlan')}
            </th>
            <th scope="col" className="type-runhead pb-3 text-start max-sm:hidden">
              {t('termsColVolume')}
            </th>
            <th scope="col" className="type-runhead pb-3 text-end">
              {t('termsColPrice')}
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map((plan) => {
            const featured = plan.slug === 'creator'
            const price = pickPrice(currency, { usd: plan.priceMonthly, aed: plan.priceMonthlyAed })
            const brands = brandsFrom(plan.monthlyCredits, plan)
            const recurring = plan.priceMonthly > 0
            const positioning = POSITIONING[plan.slug] ? t(POSITIONING[plan.slug]) : plan.name
            const cta = CTA[plan.slug]
              ? t(CTA[plan.slug])
              : recurring
                ? t('pricingCtaPaid', { plan: plan.name })
                : t('pricingCta')

            return (
              <tr key={plan.id} className="border-b border-line align-baseline">
                <th scope="row" className="py-6 pe-6 text-start font-normal">
                  <span className="type-plate-sm block">{plan.name}</span>
                  {/*
                    The recommendation, set as a marginal note. It was a pill in
                    the product's gradient floating three pixels off a card's
                    top edge, the badge every SaaS page ships.
                  */}
                  {featured && (
                    <span className="type-runhead mt-1.5 block accent-text">
                      {t('pricingChosen')}
                    </span>
                  )}
                  <span className="type-caption mt-2 block max-w-[34ch]">{positioning}</span>
                </th>

                <td className="py-6 pe-6 max-sm:hidden">
                  <span className="block text-[0.95rem]">
                    {recurring ? t('planBrandsMonth', { brands }) : t('planOneBrand')}
                  </span>
                  <span className="type-caption mt-1 block">
                    {recurring
                      ? t('planCredits', { credits: plan.monthlyCredits })
                      : t('pricingCreditsOnce', { credits: plan.monthlyCredits })}
                  </span>
                </td>

                <td className="py-6 text-end">
                  {/*
                    Tabular figures, so the column of prices aligns on its digits
                    the way a printed price list does. Proportional numerals put
                    $19 and $99 on different stems and the column reads ragged.
                  */}
                  <span className="type-plate-sm block tabular-nums">
                    {plan.priceMonthly === 0
                      ? t('pricingFree')
                      : formatPrice(price.amount, price.currency, locale)}
                  </span>
                  {recurring && (
                    <span className="type-caption mt-1 block">{t('pricingPerMonth')}</span>
                  )}

                  <Link href="/register" className="stamp-quiet mt-4 inline-flex">
                    {cta}
                  </Link>

                  <span className="type-caption mt-2 block">
                    {plan.priceMonthly === 0 ? t('planNoCard') : t('planCancel')}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/*
        The feature lists are gone from this table on purpose.

        Four columns of ticks is how a pricing grid gets tall enough to need a
        "Recommended" badge to be navigable at all, and every list here began
        "Everything in <the plan above>", so three of the four were only ever
        legible as a diff against their neighbour. The full comparison is one
        press away on the pricing page, where a wide table can hold it properly.
      */}
      <p className="type-caption mt-8">{t('termsFull')}</p>
    </div>
  )
}
