import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

export type ProjectTab = 'branding' | 'website' | 'social' | 'assistant'

/**
 * Tabs as links rather than client state.
 *
 * The tab lives in the URL, so each view is server-rendered, shareable and
 * restored on refresh — and no client JavaScript is needed to switch.
 */
export async function ProjectTabs({
  projectId,
  active,
  available,
}: {
  projectId: string
  active: ProjectTab
  available: ProjectTab[]
}) {
  const t = await getTranslations('Projects.tabs')

  if (available.length < 2) return null

  return (
    <nav className="flex gap-1 border-b border-line">
      {available.map((tab) => (
        <Link
          key={tab}
          href={`/dashboard/projects/${projectId}?tab=${tab}`}
          scroll={false}
          className={cn(
            '-mb-px border-b-2 px-4 py-2.5 text-sm transition-colors',
            tab === active
              ? 'border-brand font-medium text-fg'
              : 'border-transparent text-fg-secondary hover:text-fg',
          )}
        >
          {t(tab)}
        </Link>
      ))}
    </nav>
  )
}
