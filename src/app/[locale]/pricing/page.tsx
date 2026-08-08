import { eq } from 'drizzle-orm'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { PlanComparison } from '@/components/features/billing/plan-comparison'
import {
  BOOK_PAGE,
  PlateHead,
  RevealFallback,
  RunningFoot,
  RunningHead,
} from '@/components/features/landing/book'
import { TermsTable } from '@/components/features/landing/terms-table'
import { SectionReveal } from '@/components/ui/horizon'
import { Link } from '@/i18n/navigation'
import { billingHref, formatPrice, isCurrency, pickPrice, type Currency } from '@/lib/utils'
import { db } from '@/server/db'
import { creditPacks, plans } from '@/server/db/schema'

/**
 * The appendix: the terms in full.
 *
 * This page was the landing page's old composition still standing after the
 * landing page walked away from it. Four cards in a row with the second one
 * scaled up, ringed and badged; a rounded comparison panel; nine collapsed
 * accordion bars; a row of credit cards; all of it on near-black. Following
 * "Compare plans" dropped a reader out of a printed book into a different
 * product's pricing page, which is worse than either page being wrong on its
 * own, because it says the book was a costume.
 *
 * So it is set as the back of the same book. Same paper, same faces, same
 * running head, and the plate numbers carry on from 05 rather than restarting,
 * because an appendix is part of the volume.
 *
 * What it holds is what a terms page cannot: the full comparison, derived from
 * the columns the server actually checks, and the credit packs. The questions
 * are not repeated here. They are printed open as plate 05 in the book, and a
 * second copy of them behind nine press-to-open bars was the single most
 * template-shaped block left in the product.
 */
export default async function TermsAppendix({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ currency?: string }>
}) {
  const { locale } = await params
  const { currency: requested } = await searchParams
  setRequestLocale(locale)

  const t = await getTranslations('Pricing')
  const tl = await getTranslations('Landing')
  const currency: Currency = isCurrency(requested) ? requested : locale === 'ar' ? 'aed' : 'usd'

  const [packs, ladder] = await Promise.all([
    db.select().from(creditPacks).where(eq(creditPacks.isActive, true)).orderBy(creditPacks.sortOrder),
    db.select().from(plans).where(eq(plans.isActive, true)).orderBy(plans.sortOrder),
  ])

  const page = BOOK_PAGE

  return (
    <div className="world-paper min-h-dvh overflow-x-hidden">
      <RunningHead where="appendix" locale={locale} page={page} />
      <RevealFallback />

      <main id="content" tabIndex={-1}>
        {/* ------------------------------------------------------ plate 06 */}
        <section className={`${page} pb-24 pt-16 sm:pb-32 sm:pt-24`}>
          <PlateHead label={tl('plateLabel')} number="06" title={t('title')} note={t('subtitle')} />

          {/*
            The currency choice, set as a printed alternative rather than as a
            segmented control.

            The switch that stood here is a pill of two lit segments, and it is
            the right control inside the billing screen, where it still lives.
            On a page with no other control on it, it was the one object drawn
            for a dark interface. Prices are shown in both currencies because
            Polar charges in the customer's, and a figure that differs from the
            invoice erodes trust.
          */}
          <SectionReveal className="mt-6">
            <p className="type-caption flex flex-wrap items-baseline gap-x-3">
              <span>{t('shownIn')}</span>
              {(['usd', 'aed'] as const).map((option) => (
                <Link
                  key={option}
                  href={billingHref('/pricing', { currency: option })}
                  aria-current={option === currency ? 'true' : undefined}
                  className={
                    option === currency
                      ? 'type-runhead !text-fg underline decoration-line-strong underline-offset-4'
                      : 'type-runhead transition-colors hover:!text-fg'
                  }
                >
                  {/* Upper-cased in the markup, not by the runhead. That utility
                      drops `text-transform` in RTL, correctly, because Arabic is
                      unicameral, but these two are currency codes and stay
                      Latin in both locales. */}
                  {option.toUpperCase()}
                </Link>
              ))}
            </p>
          </SectionReveal>

          <SectionReveal className="mt-10">
            <TermsTable locale={locale} currency={currency} />
          </SectionReveal>
        </section>

        {/* ------------------------------------------------------ plate 07 */}
        {/*
          The comparison is built from the columns the application actually
          checks, not from a hand-written table. A row here exists because a
          gate exists.
        */}
        <section className={`${page} pb-24 sm:pb-32`}>
          <PlateHead
            label={tl('plateLabel')}
            number="07"
            title={t('compareTitle')}
            note={t('compareBody')}
          />

          <SectionReveal className="mt-10">
            <PlanComparison plans={ladder} />
          </SectionReveal>
        </section>

        {/* ------------------------------------------------------ plate 08 */}
        <section className={`${page} pb-24 sm:pb-32`}>
          <PlateHead
            label={tl('plateLabel')}
            number="08"
            title={t('packsTitle')}
            note={t('packsBody')}
          />

          {/*
            A price list, not three cards. The packs differ in one number each,
            so they are rows on a rule with the figures aligned on their digits,
            which is how a printed list of prices is set and how three numbers
            become comparable at a glance.
          */}
          <SectionReveal className="mt-10">
            <table className="w-full border-collapse text-start">
              <caption className="sr-only">{t('packsTitle')}</caption>
              <thead>
                <tr className="border-b border-line-strong">
                  <th scope="col" className="type-runhead pb-3 text-start">
                    {t('creditsWord')}
                  </th>
                  <th scope="col" className="type-runhead pb-3 text-end">
                    {t('packsPrice')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {packs.map((pack) => {
                  const shown = pickPrice(currency, { usd: pack.price, aed: pack.priceAed })
                  return (
                    <tr key={pack.id} className="border-b border-line align-baseline">
                      <th scope="row" className="py-5 pe-6 text-start font-normal">
                        <span className="type-plate-sm block tabular-nums">{pack.credits}</span>
                      </th>
                      <td className="py-5 text-end">
                        <span className="type-plate-sm block tabular-nums">
                          {formatPrice(shown.amount, shown.currency, locale)}
                        </span>
                        {shown.alternate && (
                          /*
                            The whole approximation is one left-to-right run.
                            `≈` is bidi-neutral, so on `/ar` it resolved to the
                            paragraph's direction and was painted at the far end
                            of the figure it qualifies: "US$ 15 ≈". A `bdi` with
                            a direction is the fix the hex codes on the landing
                            page already needed.

                            Inline-block rather than block: the cell's own
                            `text-end` places the box and `dir` governs only what
                            is inside it. As a block it filled the cell and the
                            line drifted into the middle of the page.
                          */
                          <bdi dir="ltr" className="type-caption mt-1 inline-block tabular-nums">
                            &asymp; {formatPrice(shown.alternate.amount, shown.alternate.currency, locale)}
                          </bdi>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </SectionReveal>
        </section>

        {/* --------------------------------------------------------- notes */}
        {/*
          Where the questions went. They are set open in the book rather than
          reprinted here, and this is the cross-reference a book uses to say so.
        */}
        <section className={`${page} pb-24 pt-4 sm:pb-32`}>
          <div className="grid gap-10 border-t border-line-strong pt-12 lg:grid-cols-[1fr_minmax(0,24rem)]">
            <div>
              <h2 className="type-plate-sm max-w-[20ch]">{tl('closeTitle')}</h2>
              <Link href="/register" className="stamp mt-8">
                {tl('ctaPrimary')}
              </Link>
            </div>
            <p className="type-caption max-w-[36ch] self-end">
              <a
                href={`/${locale}#notes`}
                className="text-fg underline decoration-line underline-offset-4 transition-colors hover:decoration-current"
              >
                {t('notesElsewhere')}
              </a>
            </p>
          </div>
        </section>
      </main>

      <RunningFoot where="appendix" locale={locale} page={page} />
    </div>
  )
}
