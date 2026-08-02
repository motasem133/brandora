import { Sparkles } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { ProjectCard } from '@/components/features/projects/project-card'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Link } from '@/i18n/navigation'
import { listProjects } from '@/server/db/queries/projects'
import { requireOrg } from '@/server/session'

export default async function ProjectsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('Projects')
  const { org } = await requireOrg()
  const projects = await listProjects(org.id)

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">{t('title')}</h1>
          <p className="mt-1 text-sm text-fg-secondary">{t('subtitle')}</p>
        </div>
        <Link href="/onboarding" className={buttonVariants({ size: 'sm' })}>
          {t('newProject')}
        </Link>
      </div>

      {projects.length === 0 ? (
        <Card className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="rounded-full bg-brand/15 p-4">
            <Sparkles className="size-6 text-brand" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold">{t('emptyTitle')}</h2>
            <p className="mt-1 text-sm text-fg-secondary">{t('emptyBody')}</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} locale={locale} />
          ))}
        </div>
      )}
    </div>
  )
}
