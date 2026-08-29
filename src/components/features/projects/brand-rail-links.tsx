'use client'

import { useSearchParams } from 'next/navigation'

import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

export type RailItem = {
  key: string
  href: string
  label: string
  meta?: string
  /** Which `?open=` value this entry is. Absent means the overview. */
  open?: string
}

/**
 * The rail's links, and the one thing about them that has to run on the client.
 *
 * A layout never receives `searchParams` — Next deliberately does not
 * re-render layouts on a query change — and this rail lives in a layout so it
 * survives navigation between a brand's sections without remounting. So the
 * marking of which section is open, and only that, happens here.
 *
 * Everything else stays on the server: the labels are translated there, the
 * counts are queried there, and the icons are passed as already-rendered
 * nodes. This component knows nothing about the brand.
 */
export function BrandRailLinks({
  items,
  icons,
}: {
  items: RailItem[]
  /** Rendered on the server, keyed by item, so no icon library reaches the client. */
  icons: Record<string, React.ReactNode>
}) {
  const open = useSearchParams().get('open') ?? undefined

  return (
    <>
      {items.map((item) => {
        const active = item.open ? open === item.open : !open

        return (
          <Link
            key={item.key}
            href={item.href}
            /* Every one of these is a dynamic route, so the ordinary prefetch
               fetches nothing useful. Hovering pulls the page instead. */
            unstable_dynamicOnHover
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group flex min-h-10 items-center gap-3 rounded-control px-3 text-sm transition-all duration-200',
              active
                ? 'bg-surface font-semibold text-fg shadow-[var(--shadow-soft),var(--lit-inset)]'
                : 'text-fg-secondary hover:bg-surface/60 hover:text-fg',
            )}
          >
            <span className={cn('shrink-0', active && 'text-accent')}>{icons[item.key]}</span>
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.meta && (
              <span className="shrink-0 font-mono text-[0.6875rem] text-fg-muted tabular-nums">
                {item.meta}
              </span>
            )}
          </Link>
        )
      })}
    </>
  )
}
