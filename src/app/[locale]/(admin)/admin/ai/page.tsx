import { getTranslations, setRequestLocale } from 'next-intl/server'

import { RangePicker } from '@/components/features/admin/range-picker'
import { Badge } from '@/components/ui/badge'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Table, TBody, TD, TH, THead, TRowHeader } from '@/components/ui/table'
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

      {/*
        The four figures as a line, not as four cards — same decision as the
        overview, and for the same reason. Two of them can be alarming, so the
        alarm is a word beside the number rather than a colour on it: a red
        digit says nothing to anyone who cannot see red.
      */}
      <dl className="flex flex-wrap items-center gap-x-7 gap-y-2 border-y border-line py-3.5 text-sm">
        <div className="flex items-baseline gap-2">
          <dt className="text-fg-muted">{t('ai.totalSpend')}</dt>
          <dd className="font-semibold tabular-nums text-fg">{usd(totalSpend)}</dd>
          <dd className="text-fg-muted">{t('ai.inRange', { days: range })}</dd>
        </div>

        <div className="flex items-baseline gap-2">
          <dt className="text-fg-muted">{t('ai.perGeneration')}</dt>
          <dd className="font-semibold tabular-nums text-fg">
            {latest ? usd(latest.per_generation) : '—'}
          </dd>
          {latest && latest.per_generation > 0.45 && (
            <dd>
              <Badge tone="danger">{t('ai.overBudget')}</Badge>
            </dd>
          )}
        </div>

        <div className="flex items-baseline gap-2">
          <dt className="text-fg-muted">{t('ai.imageShare')}</dt>
          <dd className="font-semibold tabular-nums text-fg">{imageShare.toFixed(0)}%</dd>
        </div>

        <div className="flex items-baseline gap-2">
          <dt className="text-fg-muted">{t('ai.unprofitable')}</dt>
          <dd className="font-semibold tabular-nums text-fg">{unprofitable.length}</dd>
          <dd>
            <Badge tone={unprofitable.length > 0 ? 'danger' : 'success'}>
              {unprofitable.length > 0 ? t('ai.losingMoney') : t('ai.allProfitable')}
            </Badge>
          </dd>
        </div>
      </dl>

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
        <Table caption={t('ai.models')} className="[&_td]:py-2.5 [&_th]:px-0 [&_td]:px-0">
          <THead>
            <TH>{t('ai.model')}</TH>
            <TH align="end">{t('ai.calls')}</TH>
            <TH align="end">{t('ai.errorRate')}</TH>
            <TH align="end">{t('ai.latency')}</TH>
            <TH align="end">{t('ai.avgCost')}</TH>
            <TH align="end">{t('ai.spend')}</TH>
          </THead>
          <TBody>
            {models.map((model) => (
              <tr key={model.model}>
                <TRowHeader className="font-mono text-xs">{model.model}</TRowHeader>
                <TD align="end" className="tabular-nums">
                  {model.calls}
                </TD>
                <TD align="end">
                  {model.error_rate > 0 ? (
                    <Badge tone={model.error_rate > 20 ? 'danger' : 'warning'}>
                      {model.error_rate.toFixed(0)}%
                    </Badge>
                  ) : (
                    <span className="text-fg-muted">0%</span>
                  )}
                </TD>
                <TD align="end" className="tabular-nums">
                  {model.avg_latency_ms ? `${(model.avg_latency_ms / 1000).toFixed(1)}s` : '—'}
                </TD>
                <TD align="end" className="tabular-nums">
                  {usd(model.avg_cost ?? 0)}
                </TD>
                <TD align="end" className="tabular-nums">
                  {usd(model.spend)}
                </TD>
              </tr>
            ))}
          </TBody>
        </Table>
      </Card>

      <Card className="space-y-4">
        <div>
          <CardTitle>{t('ai.margin')}</CardTitle>
          <CardDescription className="mt-1">{t('ai.marginHint')}</CardDescription>
        </div>
        <Table caption={t('ai.margin')} className="[&_td]:py-2.5 [&_th]:px-0 [&_td]:px-0">
          <THead>
            <TH>{t('ai.organization')}</TH>
            <TH>{t('ai.plan')}</TH>
            <TH align="end">{t('ai.revenue')}</TH>
            <TH align="end">{t('ai.cost')}</TH>
            <TH align="end">{t('ai.marginColumn')}</TH>
          </THead>
          <TBody>
            {margins.map((org) => (
              <tr key={org.id}>
                <TRowHeader>{org.name}</TRowHeader>
                <TD className="text-fg-secondary">{org.plan ?? t('ai.free')}</TD>
                <TD align="end" className="tabular-nums">
                  {formatPrice(org.revenue_cents, 'usd', locale)}
                </TD>
                <TD align="end" className="tabular-nums">
                  {usd(org.cost)}
                </TD>
                {/*
                  A negative margin is the one number on this page somebody acts
                  on, so it carries a word as well as a colour.
                */}
                <TD align="end" className="tabular-nums">
                  <span className={org.margin < 0 ? 'text-danger' : 'text-success'}>
                    ${org.margin.toFixed(2)}
                  </span>
                  {org.margin < 0 && (
                    <span className="ms-2 text-xs text-danger">{t('ai.losingMoney')}</span>
                  )}
                </TD>
              </tr>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  )
}
