import { Sparkles } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'

import { ProjectCard } from '@/components/features/projects/project-card'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Stagger, StaggerItem } from '@/components/ui/motion'
import { Link } from '@/i18n/navigation'
import { listProjects } from '@/server/db/queries/projects'
import { requireOrg } from '@/server/session'

export default async function ProjectsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('Projects')

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

      {/*
        Scoped to the list rather than declared as a route-level loading.tsx.
        A loading.tsx here would cover the whole segment including
        /projects/[id], and a segment that streams answers 200 before it knows
        the project exists — which turned a cross-tenant 404 into a 200.
      */}
      <Suspense fallback={<ProjectsSkeleton />}>
        <ProjectList locale={locale} />
      </Suspense>
    </div>
  )
}

async function ProjectList({ locale }: { locale: string }) {
  const t = await getTranslations('Projects')
  const { org } = await requireOrg()
  const projects = await listProjects(org.id)

  if (projects.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-4 py-16 text-center animate-scale-in">
        <div className="rounded-full bg-brand/15 p-4">
          <Sparkles className="size-6 text-brand" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold">{t('emptyTitle')}</h2>
          <p className="mt-1 text-sm text-fg-secondary">{t('emptyBody')}</p>
        </div>
      </Card>
    )
  }

  return (
    <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <StaggerItem key={project.id}>
          <ProjectCard project={project} locale={locale} />
        </StaggerItem>
      ))}
    </Stagger>
  )
}

/** Same shapes as the cards it stands in for, so nothing jumps on arrival. */
function ProjectsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="surface-card space-y-3 p-5">
          <div className="h-5 w-2/3 rounded bg-elevated shimmer-surface" />
          <div className="h-4 w-1/2 rounded bg-elevated shimmer-surface" />
          <div className="flex gap-1.5 pt-2">
            {Array.from({ length: 3 }).map((_, dot) => (
              <div key={dot} className="size-5 rounded-full bg-elevated shimmer-surface" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
