import { getTranslations, setRequestLocale } from 'next-intl/server'

import { RangePicker } from '@/components/features/admin/range-picker'
import { Stat } from '@/components/features/admin/stat'
import { Badge } from '@/components/ui/badge'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { formatPrice } from '@/lib/utils'
import {
  getCostPerGeneration,
  getMarginByOrg,
  getModelLeaderboard,
  getSpendByFeature,
  type Range,
} from '@/server/db/queries/admin'

const usd = (value: number) => `$${(value ?? 0).toFixed(4)}`

export default async function AdminAiPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ range?: string }>
}) {
  const { locale } = await params
  const { range: requested } = await searchParams
  setRequestLocale(locale)

  const t = await getTranslations('Admin')
  const range: Range = requested === '7' ? 7 : requested === '90' ? 90 : 30

  const [byFeature, models, perGeneration, margins] = await Promise.all([
    getSpendByFeature(range),
    getModelLeaderboard(range),
    getCostPerGeneration(range),
    getMarginByOrg(range),
  ])

  const totalSpend = byFeature.reduce((sum, row) => sum + (row.spend ?? 0), 0)
  const latest = perGeneration[0]
  const unprofitable = margins.filter((org) => org.margin < 0)

  /*
   * The documented expectation is that images are the overwhelming majority of
   * spend. A drift away from that means prompts have bloated or something is
   * retrying, and it is worth seeing rather than inferring.
   */
  const imageShare = byFeature.find((row) => row.feature === 'logo')?.share ?? 0

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">{t('ai.title')}</h1>
          <p className="mt-1 text-sm text-fg-secondary">{t('ai.subtitle')}</p>
        </div>
        <RangePicker active={range} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t('ai.totalSpend')} value={usd(totalSpend)} hint={t('ai.inRange', { days: range })} />
        <Stat
          label={t('ai.perGeneration')}
          value={latest ? usd(latest.per_generation) : '—'}
          hint={t('ai.perGenerationHint')}
          tone={latest && latest.per_generation > 0.45 ? 'danger' : undefined}
        />
        <Stat label={t('ai.imageShare')} value={`${imageShare.toFixed(0)}%`} hint={t('ai.imageShareHint')} />
        <Stat
          label={t('ai.unprofitable')}
          value={unprofitable.length}
          tone={unprofitable.length > 0 ? 'danger' : 'success'}
          hint={t('ai.unprofitableHint')}
        />
      </div>

      <Card className="space-y-4">
        <div>
          <CardTitle>{t('ai.byFeature')}</CardTitle>
          <CardDescription className="mt-1">{t('ai.byFeatureHint')}</CardDescription>
        </div>
        {byFeature.length === 0 ? (
          <CardDescription>{t('ai.noData')}</CardDescription>
        ) : (
          <ul className="space-y-3">
            {byFeature.map((row) => (
              <li key={row.feature}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="capitalize">{row.feature}</span>
                  <span className="text-fg-secondary">
                    {usd(row.spend)} · {row.calls} {t('ai.calls')} · {(row.share ?? 0).toFixed(1)}%
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-elevated">
                  <div className="h-full rounded-full bg-brand" style={{ inlineSize: `${row.share ?? 0}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="space-y-4">
        <div>
          <CardTitle>{t('ai.models')}</CardTitle>
          <CardDescription className="mt-1">{t('ai.modelsHint')}</CardDescription>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-fg-muted">
                <th className="pb-2 text-start font-medium">{t('ai.model')}</th>
                <th className="pb-2 text-end font-medium">{t('ai.calls')}</th>
                <th className="pb-2 text-end font-medium">{t('ai.errorRate')}</th>
                <th className="pb-2 text-end font-medium">{t('ai.latency')}</th>
                <th className="pb-2 text-end font-medium">{t('ai.avgCost')}</th>
                <th className="pb-2 text-end font-medium">{t('ai.spend')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {models.map((model) => (
                <tr key={model.model}>
                  <td className="py-2.5 font-mono text-xs">{model.model}</td>
                  <td className="py-2.5 text-end">{model.calls}</td>
                  <td className="py-2.5 text-end">
                    {model.error_rate > 0 ? (
                      <Badge tone={model.error_rate > 20 ? 'danger' : 'warning'}>
                        {model.error_rate.toFixed(0)}%
                      </Badge>
                    ) : (
                      <span className="text-fg-muted">0%</span>
                    )}
                  </td>
                  <td className="py-2.5 text-end">
                    {model.avg_latency_ms ? `${(model.avg_latency_ms / 1000).toFixed(1)}s` : '—'}
                  </td>
                  <td className="py-2.5 text-end">{usd(model.avg_cost ?? 0)}</td>
                  <td className="py-2.5 text-end">{usd(model.spend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="space-y-4">
        <div>
          <CardTitle>{t('ai.margin')}</CardTitle>
          <CardDescription className="mt-1">{t('ai.marginHint')}</CardDescription>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-fg-muted">
                <th className="pb-2 text-start font-medium">{t('ai.organization')}</th>
                <th className="pb-2 text-start font-medium">{t('ai.plan')}</th>
                <th className="pb-2 text-end font-medium">{t('ai.revenue')}</th>
                <th className="pb-2 text-end font-medium">{t('ai.cost')}</th>
                <th className="pb-2 text-end font-medium">{t('ai.marginColumn')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {margins.map((org) => (
                <tr key={org.id}>
                  <td className="py-2.5">{org.name}</td>
                  <td className="py-2.5 text-fg-secondary">{org.plan ?? t('ai.free')}</td>
                  <td className="py-2.5 text-end">{formatPrice(org.revenue_cents, 'usd', locale)}</td>
                  <td className="py-2.5 text-end">{usd(org.cost)}</td>
                  <td className={`py-2.5 text-end ${org.margin < 0 ? 'text-danger' : 'text-success'}`}>
                    ${org.margin.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
