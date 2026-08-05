import { Globe, MessageSquare, Palette, Share2 } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'
import { cn, formatRelative } from '@/lib/utils'
import type { LogoRound } from '@/lib/logo-rounds'
import { publicUrl } from '@/server/storage/r2'

/** One icon per section, so the current one is never signalled by colour alone. */
const SECTION_ICONS = {
  branding: Palette,
  website: Globe,
  social: Share2,
  assistant: MessageSquare,
} as const

export type ProjectSection = keyof typeof SECTION_ICONS

/**
 * The rail: where you are, and how you got here.
 *
 * It replaces a row of tabs above a column of stacked cards. Sections run down
 * the side rather than across the top, and under them — when the brand is the
 * thing on the stage — sits the logo history, every round still reachable
 * instead of scrolling past every round to reach the newest.
 *
 * Everything is a link, so the whole workspace is server-rendered, shareable
 * and restored on refresh, with no client state to lose.
 */
export async function ProjectRail({
  projectId,
  active,
  available,
  rounds = [],
  activeRound,
  primaryLogoFileId,
  locale,
}: {
  projectId: string
  active: ProjectSection
  available: ProjectSection[]
  rounds?: LogoRound[]
  activeRound?: number
  primaryLogoFileId: string | null
  locale: string
}) {
  const t = await getTranslations('Projects.tabs')
  const tb = await getTranslations('Branding')

  const showHistory = active === 'branding' && rounds.length > 0

  return (
    <aside className="space-y-6">
      {available.length > 1 && (
        /*
         * Horizontal on a phone and vertical from large up. The same links
         * either way — a phone has no room for a side rail, and a scrolling
         * row is what people already expect at that width.
         */
        <nav
          aria-label={t('label')}
          className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0"
        >
          {available.map((section) => {
            const Icon = SECTION_ICONS[section]
            const current = section === active

            return (
              <Link
                key={section}
                href={`/dashboard/projects/${projectId}?tab=${section}`}
                scroll={false}
                aria-current={current ? 'page' : undefined}
                className={cn(
                  'flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-control px-3.5 py-2.5 text-sm transition-colors duration-150 lg:w-full',
                  current
                    ? 'bg-elevated font-semibold text-fg shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--brand-primary)_28%,transparent)]'
                    : 'text-fg-secondary hover:bg-elevated/60 hover:text-fg',
                )}
              >
                <Icon className={cn('size-4 shrink-0', current ? 'text-brand' : 'text-fg-muted')} />
                {t(section)}
              </Link>
            )
          })}
        </nav>
      )}

      {showHistory && (
        <section className="space-y-2">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-fg-muted">
            {tb('history')}
          </h2>

          <ol className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
            {rounds.map((round, index) => {
              const current = round.round === activeRound

              // The chosen mark when it came from this round, so the entry
              // shows what the round is remembered by rather than whichever
              // concept happens to be first.
              const cover =
                round.concepts.find((c) => c.id === primaryLogoFileId) ?? round.concepts[0]

              return (
                <li key={round.round} className="shrink-0 lg:shrink">
                  <Link
                    href={`/dashboard/projects/${projectId}?tab=branding&round=${round.round}`}
                    scroll={false}
                    aria-current={current ? 'true' : undefined}
                    className={cn(
                      'flex w-40 items-center gap-3 rounded-control border p-2 text-start transition-colors lg:w-full',
                      current
                        ? 'border-brand/50 bg-elevated'
                        : 'border-line hover:border-line-strong hover:bg-elevated/50',
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={publicUrl(cover.r2Key) ?? `/api/files/${cover.id}`}
                      alt=""
                      loading="lazy"
                      className="size-10 shrink-0 rounded-control bg-white object-contain p-1"
                    />
                    <div className="min-w-0">
                      <p
                        className={cn(
                          'truncate text-sm',
                          current ? 'font-semibold text-fg' : 'text-fg-secondary',
                        )}
                      >
                        {index === 0 ? tb('latestRound') : tb('earlierRound', { round: round.round })}
                      </p>
                      <p className="truncate text-xs text-fg-muted">
                        {formatRelative(round.createdAt, locale)}
                      </p>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ol>
        </section>
      )}
    </aside>
  )
}
