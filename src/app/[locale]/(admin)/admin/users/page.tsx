import { getTranslations, setRequestLocale } from 'next-intl/server'

import { UserRow } from '@/components/features/admin/user-row'
import { Card, CardDescription } from '@/components/ui/card'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
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
        <form className="flex gap-2">
          <input
            name="q"
            defaultValue={q ?? ''}
            placeholder={t('users.search')}
            className="h-10 w-64 rounded-lg border border-line bg-surface px-3.5 text-sm focus:border-brand focus:outline-none"
          />
          {status && <input type="hidden" name="status" value={status} />}
        </form>

        <div className="inline-flex rounded-lg border border-line p-0.5">
          {FILTERS.map((filter) => (
            <Link
              key={filter}
              href={`/admin/users?status=${filter}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                (status ?? 'all') === filter ? 'bg-elevated text-fg' : 'text-fg-secondary hover:text-fg',
              )}
            >
              {t(`users.filters.${filter}`)}
            </Link>
          ))}
        </div>
      </div>

      <Card className="space-y-2 p-0">
        {users.length === 0 ? (
          <CardDescription className="p-6">{t('users.none')}</CardDescription>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-fg-muted">
                  <th className="p-4 text-start font-medium">{t('users.user')}</th>
                  <th className="p-4 text-start font-medium">{t('users.organization')}</th>
                  <th className="p-4 text-end font-medium">{t('users.projects')}</th>
                  <th className="p-4 text-start font-medium">{t('users.status')}</th>
                  <th className="p-4 text-end font-medium">{t('users.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {users.map((user) => (
                  <UserRow key={user.id} user={user} isSelf={user.id === session.user.id} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
