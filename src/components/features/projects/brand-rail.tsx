import { ArrowLeft, FileText, Globe, Images, Layers, MessageSquare, Package, Palette } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { BrandRailLinks, type RailItem } from '@/components/features/projects/brand-rail-links'
import { Link } from '@/i18n/navigation'
import { brandTheme } from '@/lib/brand-theme'
import { cn } from '@/lib/utils'
import type { BrandPalette } from '@/lib/brand-theme'
import { publicUrl } from '@/server/storage/r2'

/**
 * On a brand's page, the rail is the brand's contents rather than the app's.
 *
 * This is the one place the product replaces its own navigation, and it is a
 * deliberate trade. The app rail answers "where else can I go"; on a detail
 * page the question is "what is in this thing", and answering the first one
 * costs the whole left column to say five words a customer already knows. The
 * way out is the first item, which is how a detail view earns the swap — take
 * the rail and you must give back a door, prominently, or the page is a trap.
 *
 * Every entry carries its count, and that is the point of it. "Logo" says a
 * section exists; "Logo · 4 files" says whether it is worth opening, which is
 * the question someone returning to a brand a week later is actually asking.
 * An entry with nothing behind it is not rendered at all rather than shown as
 * a zero — a list of empty rows is a worse answer than a shorter list.
 */
export async function BrandRail({
  projectId,
  name,
  palette,
  logo,
  counts,
  kitLocked,
  kitPrice,
}: {
  projectId: string
  name: string
  palette: BrandPalette
  /* The two fields the chip actually reads, so the rail's query can stay a
     narrow select rather than loading whole file rows to draw a 32px mark. */
  logo: { id: string; r2Key: string } | null
  counts: {
    logos: number
    kit: number
    colours: number
    fonts: number
    hasStory: boolean
    hasCopy: boolean
    sitePages: number
  }
  kitLocked: boolean
  kitPrice: string
}) {
  const t = await getTranslations('Projects')
  const tb = await getTranslations('Branding')
  const theme = brandTheme(palette)

  const base = `/dashboard/projects/${projectId}`
  const files = (count: number) => tb('fileCount', { count })

  /*
   * The rail lists destinations, not tiles. Three tiles open the same identity
   * view, and a rail that repeated them would be three rows that all do the
   * same thing — the fastest way to make navigation feel broken.
   */
  const icon = 'size-[1.15rem] shrink-0'
  const icons: Record<string, React.ReactNode> = {
    overview: <Layers className={icon} />,
    identity: <Palette className={icon} />,
    copy: <MessageSquare className={icon} />,
    kit: <Images className={icon} />,
    website: <Globe className={icon} />,
    content: <FileText className={icon} />,
    brief: <FileText className={icon} />,
  }

  const items = [
    { key: 'overview', href: base, label: tb('overview') },
    counts.logos > 0 && {
      key: 'identity',
      href: `${base}?open=identity`,
      /* Short, because this is a nav row beside a count and not a heading. */
      label: tb('railLogos'),
      meta: files(counts.logos),
      open: 'identity',
    },
    counts.hasCopy && {
      key: 'copy',
      href: `${base}?open=copy`,
      label: tb('copy'),
      open: 'copy',
    },
    counts.kit > 0 && {
      key: 'kit',
      href: `${base}?open=kit`,
      label: tb('kit'),
      meta: files(counts.kit),
      open: 'kit',
    },
    counts.sitePages > 0 && {
      key: 'website',
      href: `${base}?open=website`,
      label: tb('website'),
      meta: tb('pageCount', { count: counts.sitePages }),
      open: 'website',
    },
    { key: 'content', href: `${base}?open=content`, label: tb('railContent'), open: 'content' },
    { key: 'brief', href: `${base}?open=brief`, label: t('brief'), open: 'brief' },
  ].filter(Boolean) as RailItem[]

  /* `z-20`, above the content panel — see the note in `app-sidebar`. */
  return (
    <aside className="sticky top-0 z-20 hidden h-dvh w-64 shrink-0 flex-col p-5 lg:flex">
      {/*
        The way back, first and unmissable. Taking the app rail is only fair if
        the page hands back a door before it shows anything else.
      */}
      <Link
        href="/dashboard/projects"
        unstable_dynamicOnHover
        className="mb-4 inline-flex min-h-9 items-center gap-2 rounded-control px-2 text-sm font-medium text-fg-secondary transition-colors hover:bg-surface/60 hover:text-fg"
      >
        <ArrowLeft className="size-4 rtl:-scale-x-100" />
        {t('title')}
      </Link>

      {/* The brand itself, small, on its own ground — so the rail says which
          brand you are inside without spending a heading on it. */}
      <div
        style={theme.vars}
        className="mb-5 flex items-center gap-2.5 rounded-card p-2.5 shadow-[var(--shadow-soft)] ring-1 ring-[var(--guest-line)] bg-[var(--guest-paper)]"
      >
        <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-control">
          {logo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={publicUrl(logo.r2Key) ?? `/api/files/${logo.id}`}
              alt=""
              className={cn('size-full object-contain', !theme.isDark && 'mix-blend-multiply')}
            />
          ) : (
            <Package className="size-4" style={{ color: 'var(--guest-ink-faint)' }} />
          )}
        </span>
        <span
          dir="auto"
          style={{ color: 'var(--guest-ink)' }}
          className="min-w-0 flex-1 truncate text-sm font-semibold"
        >
          {name}
        </span>
      </div>

      <nav aria-label={t('title')} className="flex flex-col gap-0.5">
        <BrandRailLinks items={items} icons={icons} />

        {/*
          The gap sits in the list rather than under it. A deliverable this
          brand does not have is still one of its sections — leaving it out is
          how a free customer goes on never learning the paid ones exist.
        */}
        {kitLocked && (
          <Link
            href="/dashboard/billing"
            className="group flex min-h-10 items-center gap-3 rounded-control border border-dashed border-line px-3 text-sm text-fg-muted transition-colors hover:border-brand/40 hover:text-fg"
          >
            <Package className="size-[1.15rem] shrink-0" />
            <span className="min-w-0 flex-1 truncate">{tb('kit')}</span>
            <span className="shrink-0 font-mono text-[0.6875rem] font-semibold text-accent tabular-nums">
              {kitPrice}
            </span>
          </Link>
        )}
      </nav>
    </aside>
  )
}
