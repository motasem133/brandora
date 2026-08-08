import { eq } from 'drizzle-orm'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { CurrencySwitch } from '@/components/features/billing/currency-switch'
import { PricingPlans } from '@/components/features/landing/pricing-plans'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Link } from '@/i18n/navigation'
import { formatPrice, isCurrency, pickPrice, type Currency } from '@/lib/utils'
import { db } from '@/server/db'
import { creditPacks, plans } from '@/server/db/schema'
import { PlanComparison } from '@/components/features/billing/plan-comparison'
import { Disclosure } from '@/components/ui/disclosure'

export default async function PricingPage({
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
  const currency: Currency = isCurrency(requested) ? requested : locale === 'ar' ? 'aed' : 'usd'

  const [packs, ladder] = await Promise.all([
    db.select().from(creditPacks).where(eq(creditPacks.isActive, true)).orderBy(creditPacks.sortOrder),
    db.select().from(plans).where(eq(plans.isActive, true)).orderBy(plans.sortOrder),
  ])

  /*
   * Every answer here has to match what the application does. They are written
   * once, in the catalogue, rather than in the markup — an FAQ that drifts from
   * the product is worse than no FAQ, because it is read as a promise.
   */
  const faq = t.raw('faq') as { q: string; a: string }[]

  return (
    <div className="world-dark min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="font-display text-xl font-bold accent-text">
          Brandora
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            {t('signIn')}
          </Link>
          <Link href="/register" className={buttonVariants({ size: 'sm' })}>
            {t('start')}
          </Link>
        </nav>
      </header>

      <main id="content" tabIndex={-1} className="mx-auto max-w-6xl px-6 pb-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold sm:text-4xl">{t('title')}</h1>
            <p className="mt-2 text-fg-secondary">{t('subtitle')}</p>
          </div>
          {/* Prices are shown in both currencies because Polar charges in the
              customer's, and a figure that differs from the invoice erodes trust. */}
          <CurrencySwitch active={currency} href="/pricing" />
        </div>

        {/*
          The same ladder the landing page shows, from the same table that
          bills for it. This page used to render its own — different type,
          different shapes, a `·` where the landing used a check icon, and its
          own feature list — so a visitor who clicked through from the hero
          arrived at what read as a second product.
        */}
        <div className="mt-10">
          <PricingPlans locale={locale} currency={currency} />
        </div>

        {/*
          The comparison is built from the columns the application actually
          checks, not from a hand-written table. A row here exists because a
          gate exists.
        */}
        <div className="mt-16">
          <h2 className="font-display text-xl font-semibold">{t('compareTitle')}</h2>
          <p className="mt-1 text-sm text-fg-secondary">{t('compareBody')}</p>
          <div className="mt-5">
            <PlanComparison plans={ladder} />
          </div>
        </div>

        <div className="mt-16">
          <h2 className="font-display text-xl font-semibold">{t('faqTitle')}</h2>
          <div className="mt-5 space-y-3">
            {faq.map((item) => (
              <Disclosure key={item.q} title={item.q}>
                <p className="max-w-[70ch] text-sm leading-relaxed text-fg-secondary">{item.a}</p>
              </Disclosure>
            ))}
          </div>
        </div>

        <div className="mt-16">
          <h2 className="font-display text-xl font-semibold">{t('packsTitle')}</h2>
          <p className="mt-1 text-sm text-fg-secondary">{t('packsBody')}</p>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {packs.map((pack) => {
              const shown = pickPrice(currency, { usd: pack.price, aed: pack.priceAed })
              return (
                <Card key={pack.id} className="flex items-center justify-between gap-4 p-5">
                  <div>
                    <p className="font-display font-semibold">
                      {pack.credits} {t('creditsWord')}
                    </p>
                    {shown.alternate && (
                      <p className="text-xs text-fg-muted">
                        ≈ {formatPrice(shown.alternate.amount, shown.alternate.currency, locale)}
                      </p>
                    )}
                  </div>
                  <p className="font-display text-lg font-semibold">
                    {formatPrice(shown.amount, shown.currency, locale)}
                  </p>
                </Card>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
