import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Badge } from '@/components/ui/badge'
import { Card, CardDescription } from '@/components/ui/card'
import { SegmentedControl, SegmentedLink } from '@/components/ui/segmented-control'
import { Table, TBody, TD, TH, THead, TRowHeader } from '@/components/ui/table'
import { formatDate } from '@/lib/utils'
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

      <SegmentedControl label={t('projects.status')} className="flex-wrap">
        {FILTERS.map((filter) => (
          <SegmentedLink
            key={filter}
            href={`/admin/projects?status=${filter}`}
            active={(status ?? 'all') === filter}
          >
            {filter === 'all' ? t('projects.all') : tp(`status.${filter}`)}
          </SegmentedLink>
        ))}
      </SegmentedControl>

      <Card className="p-0">
        {projects.length === 0 ? (
          <CardDescription className="p-6">{t('projects.none')}</CardDescription>
        ) : (
          <Table caption={t('projects.title')}>
            <THead>
              <TH>{t('projects.project')}</TH>
              <TH>{t('projects.organization')}</TH>
              <TH>{t('projects.status')}</TH>
              <TH align="end">{t('projects.aiCost')}</TH>
              <TH align="end">{t('projects.created')}</TH>
            </THead>
            <TBody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <TRowHeader>
                    <span className="font-medium">{project.title}</span>
                    <span className="mt-0.5 block text-xs text-fg-muted">
                      {project.industry} · {project.language}
                    </span>
                  </TRowHeader>
                  <TD className="text-fg-secondary">{project.org_name}</TD>
                  <TD>
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
                  </TD>
                  <TD align="end" className="tabular-nums">
                    ${(project.cost ?? 0).toFixed(4)}
                  </TD>
                  <TD align="end" className="text-fg-secondary">
                    {formatDate(project.created_at, locale)}
                  </TD>
                </tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
