import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Card, CardTitle } from '@/components/ui/card'
import { Table, TBody, TD, TH, THead, TRowHeader } from '@/components/ui/table'
import { formatPrice } from '@/lib/utils'
import { getOverview, getSubscriptionsByPlan } from '@/server/db/queries/admin'

export default async function AdminOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('Admin')
  const [overview, byPlan] = await Promise.all([getOverview(), getSubscriptionsByPlan()])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">{t('overview.title')}</h1>
        <p className="mt-1 text-sm text-fg-secondary">{t('overview.subtitle')}</p>
      </div>

      {/*
        The figures, once, as a line of meta.

        They were four cards across the top of the page — the exact composition
        DESIGN.md names as its anti-reference, and the one the product's own
        dashboard was rebuilt to remove. They are true and worth knowing, and
        that is the whole of what they earn. The substance of this page is the
        table underneath, which answers a question rather than stating a number.
      */}
      <dl className="flex flex-wrap items-center gap-x-7 gap-y-2 border-y border-line py-3.5 text-sm">
        {[
          [t('overview.mrr'), formatPrice(overview.mrr_cents, 'usd', locale)],
          [t('overview.users'), overview.users],
          [t('overview.projects'), overview.projects],
          [t('overview.creditsOutstanding'), overview.credits_outstanding],
          [t('overview.orgsLabel'), overview.orgs],
        ].map(([label, value]) => (
          <div key={String(label)} className="flex items-baseline gap-2">
            <dt className="text-fg-muted">{label}</dt>
            <dd className="font-semibold tabular-nums text-fg">{value}</dd>
          </div>
        ))}
      </dl>

      <Card className="p-0">
        <div className="p-7 pb-4">
          <CardTitle>{t('overview.byPlan')}</CardTitle>
          <p className="mt-1 text-sm text-fg-secondary">
            {t('overview.byPlanHint', {
              active: overview.active_subscriptions,
              newUsers: overview.users_this_month,
              completed: overview.projects_completed,
            })}
          </p>
        </div>

        <Table caption={t('overview.byPlan')}>
          <THead>
            <TH>{t('overview.plan')}</TH>
            <TH align="end">{t('overview.subscribers')}</TH>
            <TH align="end">{t('overview.mrr')}</TH>
          </THead>
          <TBody>
            {byPlan.map((plan) => (
              <tr key={plan.slug}>
                <TRowHeader>{plan.name}</TRowHeader>
                <TD align="end" className="tabular-nums">
                  {plan.count}
                </TD>
                <TD align="end" className="tabular-nums">
                  {formatPrice(plan.mrr_cents, 'usd', locale)}
                </TD>
              </tr>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  )
}
