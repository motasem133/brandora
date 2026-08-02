import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { DeleteProjectButton } from '@/components/features/projects/delete-project-button'
import { Badge } from '@/components/ui/badge'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { getProject } from '@/server/db/queries/projects'
import { requireOrg } from '@/server/session'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  setRequestLocale(locale)

  const t = await getTranslations('Projects')
  const { org } = await requireOrg()

  // getProject is org-scoped, so a project from another tenant reads as 404.
  const project = await getProject(org.id, id)
  if (!project) notFound()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-semibold">{project.title}</h1>
            <Badge>{t(`status.${project.status}`)}</Badge>
          </div>
          <p className="mt-1 text-sm text-fg-secondary">
            {t('createdOn', { date: formatDate(project.createdAt, locale) })}
          </p>
        </div>
        <DeleteProjectButton projectId={project.id} />
      </div>

      <Card className="space-y-4">
        <CardTitle>Brief</CardTitle>
        <dl className="grid gap-4 sm:grid-cols-2">
          {[
            ['Industry', project.industry],
            ['Country', project.country],
            ['Style', project.brandStyle],
            ['Language', project.language === 'ar' ? 'Arabic' : 'English'],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs uppercase tracking-wide text-fg-muted">{label}</dt>
              <dd className="mt-0.5 text-sm capitalize">{value}</dd>
            </div>
          ))}
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-fg-muted">Target audience</dt>
            <dd className="mt-0.5 text-sm">{project.targetAudience}</dd>
          </div>
        </dl>
      </Card>

      {/* Generation lands in Phase 3 — see Appendix C of the system documentation. */}
      <Card className="text-center">
        <CardTitle>Generation coming in Phase 3</CardTitle>
        <CardDescription className="mt-1">
          The AI pipeline, live progress stream and generated assets attach here.
        </CardDescription>
      </Card>
    </div>
  )
}
