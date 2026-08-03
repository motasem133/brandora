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
            /*
             * The underline is a scaled pseudo-element rather than a border,
             * so it grows from the centre of the tab you picked. A border
             * swap has no in-between state to animate.
             */
            'relative -mb-px cursor-pointer px-4 py-2.5 text-sm transition-colors duration-200',
            'after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-center after:rounded-full after:bg-brand after:transition-transform after:duration-200 after:content-[""]',
            tab === active
              ? 'font-medium text-fg after:scale-x-100'
              : 'text-fg-secondary after:scale-x-0 hover:text-fg hover:after:scale-x-50 hover:after:bg-line-strong',
          )}
        >
          {t(tab)}
        </Link>
      ))}
    </nav>
  )
}
