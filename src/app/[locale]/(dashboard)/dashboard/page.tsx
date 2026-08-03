import { CheckCircle2, Coins, FolderOpen, Sparkles } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { ProjectCard } from '@/components/features/projects/project-card'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Link } from '@/i18n/navigation'
import { countProjects, countProjectsByStatus, listProjects } from '@/server/db/queries/projects'
import { requireOrg } from '@/server/session'

export default async function OverviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('Dashboard')
  const { user, org } = await requireOrg()

  const [total, completed, recent] = await Promise.all([
    countProjects(org.id),
    countProjectsByStatus(org.id, 'completed'),
    listProjects(org.id, 6),
  ])

  const stats = [
    { label: t('statProjects'), value: total, icon: FolderOpen },
    { label: t('statCompleted'), value: completed, icon: CheckCircle2 },
    { label: t('statCredits'), value: org.creditBalance, icon: Coins },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {t('welcome', { name: user.name.split(' ')[0] })}
        </h1>
        <p className="mt-2 text-fg-secondary">{t('subtitle')}</p>
      </div>

      <div className="grid gap-4 stagger-children sm:grid-cols-3">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            style={{ '--i': index } as React.CSSProperties}
            className="card-lit interactive p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-fg-secondary">{stat.label}</p>
              <span className="icon-chip">
                <stat.icon className="size-4" />
              </span>
            </div>
            <p className="mt-3 stat-figure text-4xl">{stat.value}</p>
          </div>
        ))}
      </div>

      {recent.length === 0 ? (
        <Card className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="rounded-full bg-brand/15 p-4">
            <Sparkles className="size-6 text-brand" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold">{t('emptyTitle')}</h2>
            <p className="mt-1 text-sm text-fg-secondary">{t('emptyBody')}</p>
          </div>
          <Link href="/onboarding" className={buttonVariants()}>
            {t('emptyCta')}
          </Link>
        </Card>
      ) : (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">{t('recentProjects')}</h2>
            <Link href="/dashboard/projects" className="text-sm text-brand hover:underline">
              {t('viewAll')}
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((project) => (
              <ProjectCard key={project.id} project={project} locale={locale} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
