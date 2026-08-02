import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Stat } from '@/components/features/admin/stat'
import { Badge } from '@/components/ui/badge'
import { Card, CardTitle } from '@/components/ui/card'
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={t('overview.mrr')}
          value={formatPrice(overview.mrr_cents, 'usd', locale)}
          hint={t('overview.mrrHint', { count: overview.active_subscriptions })}
        />
        <Stat
          label={t('overview.users')}
          value={overview.users}
          hint={t('overview.newThisMonth', { count: overview.users_this_month })}
        />
        <Stat
          label={t('overview.projects')}
          value={overview.projects}
          hint={t('overview.completed', { count: overview.projects_completed })}
        />
        <Stat
          label={t('overview.creditsOutstanding')}
          value={overview.credits_outstanding}
          hint={t('overview.creditsHint')}
        />
      </div>

      <Card className="space-y-4">
        <CardTitle>{t('overview.byPlan')}</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-start text-xs uppercase tracking-wide text-fg-muted">
                <th className="pb-2 text-start font-medium">{t('overview.plan')}</th>
                <th className="pb-2 text-end font-medium">{t('overview.subscribers')}</th>
                <th className="pb-2 text-end font-medium">{t('overview.mrr')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {byPlan.map((plan) => (
                <tr key={plan.slug}>
                  <td className="py-2.5">{plan.name}</td>
                  <td className="py-2.5 text-end">{plan.count}</td>
                  <td className="py-2.5 text-end">{formatPrice(plan.mrr_cents, 'usd', locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Badge>{t('overview.orgs', { count: overview.orgs })}</Badge>
      </Card>
    </div>
  )
}
