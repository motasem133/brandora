import { Check } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { eq } from 'drizzle-orm'

import { Cell } from '@/components/ui/horizon'
import { buttonVariants } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import { cn, formatPrice, pickPrice, type Currency } from '@/lib/utils'
import { brandsFrom, contentPiecesFrom } from '@/server/billing/credits'
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
/** Copy keyed by the plans this product ships. Anything else falls back. */
const POSITIONING: Record<string, 'planFor_free'> = {
  free: 'planFor_free',
  creator: 'planFor_creator' as 'planFor_free',
  studio: 'planFor_studio' as 'planFor_free',
}

const CTA: Record<string, 'planCta_free'> = {
  free: 'planCta_free',
  creator: 'planCta_creator' as 'planCta_free',
  studio: 'planCta_studio' as 'planCta_free',
}

/**
 * A line under the button, for the thing a plan cannot answer on its own.
 *
 * Only Studio has one: ten seats is a ceiling, and a team of twelve looking at
 * the top plan needs somewhere to go other than away.
 */
const FOOTNOTE: Record<string, 'planFootnote_studio'> = {
  studio: 'planFootnote_studio',
}

/** Where "contact us" goes. The same address the product already sends from. */
const CONTACT_EMAIL = 'hello@enigmitic.com'

export async function PricingPlans({
  locale,
  currency = 'usd',
}: {
  locale: string
  currency?: Currency
}) {
  const t = await getTranslations('Landing')
  const rows = await db.select().from(plans).where(eq(plans.isActive, true)).orderBy(plans.sortOrder)

  /*
   * No plans, no ladder.
   *
   * This reads a table an admin screen can edit, so "every plan is inactive" is
   * a state the query can genuinely return — and it used to render an empty
   * grid under a heading and an assurance row promising a free tier that was no
   * longer on the page. An empty section is a smaller lie than a broken one.
   */
  if (rows.length === 0) return null

  /*
   * The column count follows the plan count.
   *
   * `md:grid-cols-3` was hardcoded against a seed file that happens to ship
   * three. The file's own comment notes an admin can add a plan and that an
   * unknown slug still renders — at four that meant a row of three and one
   * orphan below it, which reads as a mistake rather than as a tier.
   */
  const columns =
    rows.length === 1
      ? 'mx-auto max-w-md'
      : rows.length === 2
        ? 'sm:grid-cols-2'
        : rows.length === 3
          ? 'md:grid-cols-3'
          : 'sm:grid-cols-2 xl:grid-cols-4'

  return (
    <div className={cn('grid gap-5', columns)}>
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
        const brands = brandsFrom(plan.monthlyCredits, plan)
        const pieces = contentPiecesFrom(plan.monthlyCredits)
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
        const footnote = FOOTNOTE[plan.slug] ? t(FOOTNOTE[plan.slug]) : null

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

                {/* Wraps rather than overflows. The figure is 48px and the
                    string is a formatted currency from the database — AED
                    renders longer than USD, and an admin can price a plan at
                    anything. At today's values nothing wraps. */}
                <p className="mt-4 flex flex-wrap items-baseline gap-x-1.5">
                  <span className="min-w-0 font-display text-5xl font-semibold tracking-[-0.02em]">
                    {plan.priceMonthly === 0
                      ? t('pricingFree')
                      : formatPrice(price.amount, price.currency, locale)}
                  </span>
                  {plan.priceMonthly > 0 && (
                    <span className="text-sm text-fg-muted">{t('pricingPerMonth')}</span>
                  )}
                </p>

                {/*
                  Credits lead, and what they are worth sits under them.

                  This was the other way up, on the reasoning that a brand count
                  is a number someone can act on. It is — but almost nobody
                  makes twenty brands a month, so it described a plan nobody was
                  buying. Credits are what the plan actually grants and what
                  every part of the product spends, including the content a
                  customer comes back for. The brand count survives underneath,
                  as one of two things the same credits buy.
                */}
                <p className="mt-5 rounded-control border border-line bg-elevated/40 px-3.5 py-3">
                  <span className="type-title block">
                    {recurring
                      ? t('planCreditsLead', { credits: plan.monthlyCredits })
                      : t('planCreditsOnceLead', { credits: plan.monthlyCredits })}
                  </span>
                  <span className="mt-0.5 block text-xs text-fg-muted">
                    {recurring
                      ? t('planWorth', { brands, pieces })
                      : t('planWorthOnce', { pieces })}
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

                {/*
                  A mailto rather than a route: there is no contact page, and
                  inventing one to satisfy the sentence would be a dead link on
                  the page that asks for money. "Contact us" has to contact
                  someone.
                */}
                {footnote && (
                  <p className="text-center text-xs text-fg-muted">
                    {/* 15px tall as a bare inline link, which is under WCAG
                        2.2's 24px floor. The padding carries the target and
                        replaces the paragraph's old top margin, so the card is
                        laid out as before. */}
                    <a
                      href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Brandora Studio — more than 10 seats')}`}
                      className="accent-text inline-block px-2 py-3 underline-offset-4 hover:underline"
                    >
                      {footnote}
                    </a>
                  </p>
                )}

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
