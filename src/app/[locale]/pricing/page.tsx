import { eq } from 'drizzle-orm'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { CurrencySwitch } from '@/components/features/billing/currency-switch'
import { PricingFaq } from '@/components/features/landing/pricing-faq'
import { PricingPlans } from '@/components/features/landing/pricing-plans'
import { PlanOffersJsonLd } from '@/components/seo/json-ld'
import { StartCta } from '@/components/features/landing/start-cta'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Link } from '@/i18n/navigation'
import { alternatesFor, socialMeta } from '@/lib/seo'
import { formatPrice, isCurrency, pickPrice, type Currency } from '@/lib/utils'
import { db } from '@/server/db'
import { creditPacks, plans } from '@/server/db/schema'
import { getSession } from '@/server/session'
import { PlanComparison } from '@/components/features/billing/plan-comparison'

/**
 * Prices in the description, in the currency this locale is shown.
 *
 * `/ar` defaults to AED below, so its description quotes AED — a search result
 * promising $19 to a reader whose page says 69 is a result that gets clicked
 * once. The figures are the seeded ones and are checked by `test:copy`; if a
 * price moves, that test is what says this string moved with it.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Meta' })
  const common = await getTranslations({ locale, namespace: 'Common' })

  const title = t('pricingTitle')
  const description = t('pricingDescription')

  return {
    title,
    description,
    alternates: alternatesFor(locale, '/pricing'),
    ...socialMeta({
      locale,
      path: '/pricing',
      title: `${title} · ${common('appName')}`,
      description,
      siteName: common('appName'),
      imageAlt: t('ogAlt'),
    }),
  }
}

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
  const common = await getTranslations('Common')
  const session = await getSession()
  const currency: Currency = isCurrency(requested) ? requested : locale === 'ar' ? 'aed' : 'usd'

  const [packs, ladder] = await Promise.all([
    db.select().from(creditPacks).where(eq(creditPacks.isActive, true)).orderBy(creditPacks.sortOrder),
    db.select().from(plans).where(eq(plans.isActive, true)).orderBy(plans.sortOrder),
  ])


  return (
    <div className="world-dark min-h-dvh">
      {/*
        Built from `ladder`, the same rows the cards below render.

        `name` is the product's name, not the page's heading. It was `t('title')`
        — "Create your brand. Then keep building it." — which is a good headline
        and a nonsense value for `Product.name`: the one string a search engine
        or an answer engine takes as what this thing is called.
      */}
      <PlanOffersJsonLd
        locale={locale}
        name={common('appName')}
        description={t('subtitle')}
        offers={ladder.map((plan) => {
          const price = pickPrice(currency, {
            usd: plan.priceMonthly,
            aed: plan.priceMonthlyAed,
          })
          return { name: plan.name, price: price.amount, currency: price.currency }
        })}
      />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="font-display text-xl font-bold accent-text">
          Brandora
        </Link>
        {/* Signed in, "Sign in" is as wrong as "Start free" — both offer a
            door the visitor is already through. StartCta carries them on. */}
        <nav className="flex items-center gap-2">
          {!session && (
            <Link href="/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
              {t('signIn')}
            </Link>
          )}
          <StartCta size="sm" />
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

        {/* One component, so the landing page and this one cannot disagree. */}
        <PricingFaq className="mt-16" />

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
