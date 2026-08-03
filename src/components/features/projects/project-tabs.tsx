import { Globe, MessageSquare, Palette, Share2 } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

/** One icon per panel, so the active tab is never signalled by colour alone. */
const TAB_ICONS = {
  branding: Palette,
  website: Globe,
  social: Share2,
  assistant: MessageSquare,
} as const

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
    /*
     * A segmented control rather than an underline row.
     *
     * The active tab is carried by a filled surface, a border and a weight
     * change, not by colour alone — the underline it replaced was a 2px hue
     * difference, which is the first thing to disappear for anyone who cannot
     * separate it from the rule beneath.
     */
    <nav
      aria-label={t('label')}
      className="sticky top-16 z-10 -mx-1 flex gap-1 overflow-x-auto rounded-control border border-line bg-surface/80 p-1 backdrop-blur-xl"
    >
      {available.map((tab) => {
        const Icon = TAB_ICONS[tab]
        const current = tab === active

        return (
          <Link
            key={tab}
            href={`/dashboard/projects/${projectId}?tab=${tab}`}
            scroll={false}
            aria-current={current ? 'page' : undefined}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-[calc(var(--radius-control)-3px)] px-4 py-2.5 text-sm transition-colors duration-150',
              current
                ? 'bg-elevated font-semibold text-fg shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--brand-primary)_28%,transparent)]'
                : 'text-fg-secondary hover:bg-elevated/60 hover:text-fg',
            )}
          >
            <Icon className={cn('size-4 shrink-0', current ? 'text-brand' : 'text-fg-muted')} />
            {t(tab)}
          </Link>
        )
      })}
    </nav>
  )
}
