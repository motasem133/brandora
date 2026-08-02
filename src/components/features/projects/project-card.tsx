import { useTranslations } from 'next-intl'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Link } from '@/i18n/navigation'
import { formatDate } from '@/lib/utils'
import type { Project } from '@/server/db/schema'

const STATUS_TONE = {
  draft: 'neutral',
  queued: 'neutral',
  generating: 'brand',
  completed: 'success',
  failed: 'danger',
  partial: 'warning',
} as const

export function ProjectCard({ project, locale }: { project: Project; locale: string }) {
  const t = useTranslations('Projects')

  return (
    <Link
      href={`/dashboard/projects/${project.id}`}
      className="block transition-transform hover:-translate-y-0.5"
    >
      <Card className="h-full p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-1 font-display font-semibold">{project.title}</h3>
          <Badge tone={STATUS_TONE[project.status]}>{t(`status.${project.status}`)}</Badge>
        </div>

        <p className="mt-1 text-sm text-fg-secondary">
          {project.industry} · {project.country}
        </p>

        {project.preferredColors.length > 0 && (
          <div className="mt-4 flex gap-1.5">
            {project.preferredColors.map((color) => (
              <span
                key={color}
                className="size-5 rounded-full border border-line"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        )}

        <p className="mt-4 text-xs text-fg-muted">
          {t('createdOn', { date: formatDate(project.createdAt, locale) })}
        </p>
      </Card>
    </Link>
  )
}
