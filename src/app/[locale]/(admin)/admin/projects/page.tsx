import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Badge } from '@/components/ui/badge'
import { Card, CardDescription } from '@/components/ui/card'
import { Link } from '@/i18n/navigation'
import { cn, formatDate } from '@/lib/utils'
import { listAllProjects } from '@/server/db/queries/admin'

const FILTERS = ['all', 'completed', 'generating', 'failed', 'partial', 'draft'] as const

export default async function AdminProjectsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ status?: string }>
}) {
  const { locale } = await params
  const { status } = await searchParams
  setRequestLocale(locale)

  const t = await getTranslations('Admin')
  const tp = await getTranslations('Projects')
  const projects = await listAllProjects({ status })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">{t('projects.title')}</h1>
        <p className="mt-1 text-sm text-fg-secondary">{t('projects.subtitle')}</p>
      </div>

      <div className="inline-flex flex-wrap rounded-lg border border-line p-0.5">
        {FILTERS.map((filter) => (
          <Link
            key={filter}
            href={`/admin/projects?status=${filter}`}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              (status ?? 'all') === filter ? 'bg-elevated text-fg' : 'text-fg-secondary hover:text-fg',
            )}
          >
            {filter === 'all' ? t('projects.all') : tp(`status.${filter}`)}
          </Link>
        ))}
      </div>

      <Card className="p-0">
        {projects.length === 0 ? (
          <CardDescription className="p-6">{t('projects.none')}</CardDescription>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-fg-muted">
                  <th className="p-4 text-start font-medium">{t('projects.project')}</th>
                  <th className="p-4 text-start font-medium">{t('projects.organization')}</th>
                  <th className="p-4 text-start font-medium">{t('projects.status')}</th>
                  <th className="p-4 text-end font-medium">{t('projects.aiCost')}</th>
                  <th className="p-4 text-end font-medium">{t('projects.created')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td className="p-4">
                      <p className="font-medium">{project.title}</p>
                      <p className="text-xs text-fg-muted">
                        {project.industry} · {project.language}
                      </p>
                    </td>
                    <td className="p-4 text-fg-secondary">{project.org_name}</td>
                    <td className="p-4">
                      <Badge
                        tone={
                          project.status === 'completed'
                            ? 'success'
                            : project.status === 'failed'
                              ? 'danger'
                              : project.status === 'partial'
                                ? 'warning'
                                : 'neutral'
                        }
                      >
                        {tp(`status.${project.status}`)}
                      </Badge>
                    </td>
                    <td className="p-4 text-end">${(project.cost ?? 0).toFixed(4)}</td>
                    <td className="p-4 text-end text-fg-secondary">
                      {formatDate(project.created_at, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
