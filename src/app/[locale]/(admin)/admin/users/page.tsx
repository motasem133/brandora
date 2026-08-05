import { getTranslations, setRequestLocale } from 'next-intl/server'

import { UserRow } from '@/components/features/admin/user-row'
import { Card, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SegmentedControl, SegmentedLink } from '@/components/ui/segmented-control'
import { Table, TBody, TH, THead } from '@/components/ui/table'
import { listUsers } from '@/server/db/queries/admin'
import { requireAdmin } from '@/server/session'

const FILTERS = ['all', 'active', 'suspended'] as const

export default async function AdminUsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const { locale } = await params
  const { q, status } = await searchParams
  setRequestLocale(locale)

  const t = await getTranslations('Admin')
  const session = await requireAdmin()
  const users = await listUsers({ search: q, status })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">{t('users.title')}</h1>
        <p className="mt-1 text-sm text-fg-secondary">{t('users.subtitle')}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* A GET form keeps search in the URL and needs no client JavaScript. */}
        <form className="flex gap-2" role="search">
          {/* The placeholder was the only label this field had. */}
          <label htmlFor="user-search" className="sr-only">
            {t('users.search')}
          </label>
          <Input
            id="user-search"
            name="q"
            type="search"
            defaultValue={q ?? ''}
            placeholder={t('users.search')}
            className="w-64"
          />
          {status && <input type="hidden" name="status" value={status} />}
        </form>

        <SegmentedControl label={t('users.status')}>
          {FILTERS.map((filter) => (
            <SegmentedLink
              key={filter}
              href={`/admin/users?status=${filter}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
              active={(status ?? 'all') === filter}
              className="capitalize"
            >
              {t(`users.filters.${filter}`)}
            </SegmentedLink>
          ))}
        </SegmentedControl>
      </div>

      <Card className="space-y-2 p-0">
        {users.length === 0 ? (
          <CardDescription className="p-6">{t('users.none')}</CardDescription>
        ) : (
          <Table caption={t('users.title')}>
            <THead>
              <TH>{t('users.user')}</TH>
              <TH>{t('users.organization')}</TH>
              <TH align="end">{t('users.projects')}</TH>
              <TH>{t('users.status')}</TH>
              <TH align="end">{t('users.actions')}</TH>
            </THead>
            <TBody>
              {users.map((user) => (
                <UserRow key={user.id} user={user} isSelf={user.id === session.user.id} />
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
