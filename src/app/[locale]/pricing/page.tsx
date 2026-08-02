import { eq } from 'drizzle-orm'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { CurrencySwitch } from '@/components/features/billing/currency-switch'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardTitle } from '@/components/ui/card'
import { Link } from '@/i18n/navigation'
import { formatPrice, isCurrency, pickPrice, type Currency } from '@/lib/utils'
import { db } from '@/server/db'
import { creditPacks, plans } from '@/server/db/schema'

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

  const [allPlans, packs] = await Promise.all([
    db.select().from(plans).where(eq(plans.isActive, true)).orderBy(plans.sortOrder),
    db.select().from(creditPacks).where(eq(creditPacks.isActive, true)).orderBy(creditPacks.sortOrder),
  ])

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="font-display text-xl font-bold gradient-text">
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

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold sm:text-4xl">{t('title')}</h1>
            <p className="mt-2 text-fg-secondary">{t('subtitle')}</p>
          </div>
          {/* Prices are shown in both currencies because Polar charges in the
              customer's, and a figure that differs from the invoice erodes trust. */}
          <CurrencySwitch active={currency} href="/pricing" />
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {allPlans.map((plan) => {
            const shown = pickPrice(currency, {
              usd: plan.priceMonthly,
              aed: plan.priceMonthlyAed,
            })
            const features = (plan.features as Record<string, string[]>)?.[locale] ?? []
            const highlighted = plan.slug === 'pro'

            return (
              <Card key={plan.id} className={highlighted ? 'border-brand' : undefined}>
                <div className="flex items-baseline justify-between gap-2">
                  <CardTitle>{plan.name}</CardTitle>
                  {highlighted && <Badge tone="brand">{t('popular')}</Badge>}
                </div>

                <p className="mt-3 font-display text-3xl font-semibold">
                  {formatPrice(shown.amount, shown.currency, locale)}
                  <span className="text-sm font-normal text-fg-muted">{t('perMonth')}</span>
                </p>
                {shown.alternate && (
                  <p className="text-xs text-fg-muted">
                    ≈ {formatPrice(shown.alternate.amount, shown.alternate.currency, locale)}
                  </p>
                )}

                <p className="mt-2 text-sm text-fg-secondary">
                  {t('credits', { credits: plan.monthlyCredits })}
                </p>

                <ul className="mt-5 space-y-2 text-sm text-fg-secondary">
                  {features.map((feature) => (
                    <li key={feature}>· {feature}</li>
                  ))}
                </ul>

                <Link
                  href="/register"
                  className={`mt-6 w-full ${buttonVariants({
                    variant: highlighted ? 'primary' : 'secondary',
                    size: 'sm',
                  })}`}
                >
                  {plan.priceMonthly === 0 ? t('startFree') : t('choose', { plan: plan.name })}
                </Link>
              </Card>
            )
          })}
        </div>

        <div className="mt-12">
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
      </section>
    </div>
  )
}
