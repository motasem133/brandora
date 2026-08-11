import { getTranslations, setRequestLocale } from 'next-intl/server'

import { CreditGrant } from '@/components/features/admin/credit-grant'
import { Badge } from '@/components/ui/badge'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TBody, TD, TH, THead, TRowHeader } from '@/components/ui/table'
import { formatDate } from '@/lib/utils'
import { listCreditAdjustments, listWorkspaces } from '@/server/db/queries/admin'
import { requireAdmin } from '@/server/session'

/**
 * Credits, moved by hand and on the record.
 *
 * `adjustCredits` was written with the ledger and wired to nothing, so the
 * only way to grant a customer credits was a statement typed against
 * production — and two have been. Every manual write to a money table is an
 * incident waiting for a bad afternoon: no confirmation, no note, no second
 * pair of eyes, and nothing to read afterwards except a balance that changed.
 *
 * The two halves of the screen are one argument. Making an adjustment and
 * reading the ones already made belong together, because "has somebody already
 * refunded this customer?" is the question asked immediately before refunding
 * them twice.
 *
 * Ordered by balance, ascending. The workspace about to run out is the one
 * somebody is on this page about.
 */
export default async function AdminCreditsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string }>
}) {
  const { locale } = await params
  const { q } = await searchParams
  setRequestLocale(locale)

  const t = await getTranslations('Admin.credits')
  await requireAdmin()

  const [workspaces, adjustments] = await Promise.all([
    listWorkspaces({ search: q }),
    listCreditAdjustments(),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">{t('title')}</h1>
        <p className="mt-1 text-sm text-fg-secondary">{t('subtitle')}</p>
      </div>

      {/* A GET form keeps the search in the URL and needs no client JavaScript,
          the same as the users screen. */}
      <form className="flex gap-2" role="search">
        <label htmlFor="workspace-search" className="sr-only">
          {t('search')}
        </label>
        <Input
          id="workspace-search"
          name="q"
          defaultValue={q ?? ''}
          placeholder={t('searchPlaceholder')}
          className="w-72"
        />
      </form>

      <Card className="p-0">
        {workspaces.length === 0 ? (
          <CardDescription className="p-6">{t('none')}</CardDescription>
        ) : (
          <Table caption={t('title')}>
            <THead>
              <TH>{t('workspace')}</TH>
              <TH>{t('plan')}</TH>
              <TH align="end">{t('balance')}</TH>
              <TH align="end">{t('adjust')}</TH>
            </THead>
            <TBody>
              {workspaces.map((workspace) => (
                <tr key={workspace.id}>
                  <TRowHeader>
                    {workspace.name}
                    <span className="mt-0.5 block text-xs text-fg-muted">
                      {workspace.owner_email ?? '—'} · {t('projects', { count: workspace.projects })}
                    </span>
                  </TRowHeader>
                  <TD className="text-fg-secondary">{workspace.plan_name ?? t('noPlan')}</TD>
                  <TD align="end">
                    {/* Warned below ten: that is under two brand runs, which is
                        the point at which a customer is about to be stopped. */}
                    <Badge tone={workspace.credit_balance < 10 ? 'warning' : 'neutral'}>
                      {workspace.credit_balance}
                    </Badge>
                  </TD>
                  <TD align="end">
                    <div className="flex justify-end">
                      <CreditGrant
                        organizationId={workspace.id}
                        organizationName={workspace.name}
                        balance={workspace.credit_balance}
                      />
                    </div>
                  </TD>
                </tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {/* ------------------------------------------------------- the record */}
      <section className="space-y-3">
        <div>
          <CardTitle>{t('historyTitle')}</CardTitle>
          <CardDescription className="mt-1">{t('historySubtitle')}</CardDescription>
        </div>

        <Card className="p-0">
          {adjustments.length === 0 ? (
            <CardDescription className="p-6">{t('historyNone')}</CardDescription>
          ) : (
            <Table caption={t('historyTitle')}>
              <THead>
                <TH>{t('workspace')}</TH>
                <TH>{t('note')}</TH>
                <TH>{t('by')}</TH>
                <TH align="end">{t('amount')}</TH>
                <TH align="end">{t('when')}</TH>
              </THead>
              <TBody>
                {adjustments.map((row) => (
                  <tr key={row.id}>
                    <TD>{row.org_name}</TD>
                    <TD className="text-fg-secondary">{row.note ?? '—'}</TD>
                    <TD className="text-fg-secondary">{row.by ?? '—'}</TD>
                    <TD align="end" className="tabular-nums">
                      {/* Signed, and coloured by direction: a correction that
                          takes credits away must not read like a grant. */}
                      <span className={row.amount > 0 ? 'text-success' : 'text-danger'}>
                        {row.amount > 0 ? '+' : ''}
                        {row.amount}
                      </span>
                    </TD>
                    <TD align="end" className="text-fg-secondary">
                      {formatDate(row.created_at, locale)}
                    </TD>
                  </tr>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </section>
    </div>
  )
}
