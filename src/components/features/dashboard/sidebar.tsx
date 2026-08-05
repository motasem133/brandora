'use client'

import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { ADMIN_NAV, NAV, isNavActive } from '@/components/features/dashboard/nav-items'
import { Logo, LogoMark } from '@/components/ui/logo'
import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

/**
 * A project page is a document, and the rail is chrome around it.
 *
 * Matches a single project, not the list: `/dashboard/projects` is a page you
 * navigate from and should keep its full rail, while `/dashboard/projects/<id>`
 * is one you settle into. `usePathname` here comes from next-intl and has
 * already had the locale stripped, so this holds in both languages.
 */
const FOCUSED = /^\/dashboard\/projects\/[^/]+$/

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const t = useTranslations('Nav')
  const pathname = usePathname()

  const focused = FOCUSED.test(pathname)

  /*
   * `null` means "whatever this route asks for". A press sets it, and it is
   * cleared only when crossing between a focused route and an ordinary one —
   * not on every navigation.
   *
   * That distinction is the whole behaviour. Clearing on every path change
   * would reopen the rail behind the back of anyone who closed it and then
   * moved between two ordinary pages; never clearing it would mean opening the
   * rail once left every project page afterwards opening too.
   */
  const [override, setOverride] = useState<boolean | null>(null)
  const [wasFocused, setWasFocused] = useState(focused)

  /*
   * Adjusted during render rather than in an effect. React re-runs this
   * component immediately, before the browser paints, so the rail never shows
   * one state and then corrects itself — which an effect would have done, and
   * which is visible as a flicker on every entry into a project.
   */
  if (wasFocused !== focused) {
    setWasFocused(focused)
    setOverride(null)
  }

  const collapsed = override ?? focused

  return (
    <aside
      className={cn(
        'relative z-10 hidden shrink-0 border-e border-line bg-surface/60 backdrop-blur-xl lg:block',
        // Width is the only thing that animates; the contents swap at the ends.
        'transition-[width] duration-300 ease-[var(--ease-out-soft)]',
        collapsed ? 'w-[4.75rem]' : 'w-60',
      )}
    >
      <div className="sticky top-0 flex h-dvh flex-col p-4">
        {/*
          The toggle rides with the logo at the head of the rail.

          It began at the foot, on the reasoning that a control which never
          moves is a control people can find again — but the foot of a left rail
          is where the framework's own dev overlay sits, and a button you cannot
          press while building is worse than one that shifts forty pixels.
        */}
        <div
          className={cn('mb-8 flex items-center gap-1', collapsed ? 'flex-col' : 'justify-between')}
        >
          <Link
            href="/dashboard"
            className={cn('flex h-8 items-center', collapsed ? 'justify-center' : 'px-2')}
            aria-label={t('overview')}
          >
            {/*
              The mark alone when collapsed rather than the wordmark clipped by
              the rail's edge. A logo sliced in half by an overflow is the tell
              that a sidebar was narrowed rather than designed to narrow.
            */}
            {collapsed ? (
              <LogoMark className="size-7" />
            ) : (
              <Logo className="text-xl" markClassName="size-7" animated />
            )}
          </Link>

          <button
            type="button"
            onClick={() => setOverride(!collapsed)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? t('expandSidebar') : t('collapseSidebar')}
            title={collapsed ? t('expandSidebar') : t('collapseSidebar')}
            className="grid size-9 shrink-0 place-items-center rounded-control text-fg-muted transition-colors hover:bg-elevated hover:text-fg"
          >
            {/* The glyph points the way the rail will move, mirrored for RTL. */}
            {collapsed ? (
              <PanelLeftOpen className="size-4 rtl:-scale-x-100" />
            ) : (
              <PanelLeftClose className="size-4 rtl:-scale-x-100" />
            )}
          </button>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV.map(({ href, key, icon: Icon }) => {
            const active = isNavActive(pathname, href)

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                /*
                 * The label is the accessible name either way — collapsing the
                 * rail must not turn four named destinations into four
                 * unlabelled glyphs. `title` gives the same words to a pointer.
                 */
                title={collapsed ? t(key) : undefined}
                className={cn(
                  /*
                   * The left rule is the active marker: it grows from nothing
                   * on the item you moved to, so the eye follows the change
                   * instead of hunting for which row changed shade.
                   */
                  'group relative flex min-h-11 items-center rounded-control py-2.5 text-sm transition-all duration-200',
                  'before:absolute before:inset-y-2 before:-start-1 before:w-0.5 before:rounded-full before:bg-brand before:transition-transform before:duration-200 before:content-[""]',
                  collapsed ? 'justify-center px-0' : 'gap-3 px-3',
                  active
                    ? 'bg-[image:linear-gradient(100deg,color-mix(in_oklch,var(--brand-primary)_22%,transparent),transparent_70%)] font-medium text-fg shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--brand-primary)_20%,transparent)] before:scale-y-100'
                    : 'text-fg-secondary before:scale-y-0 hover:bg-elevated hover:text-fg',
                )}
              >
                <Icon className="size-4 shrink-0 transition-transform duration-200 group-hover:scale-110" />
                <span className={cn(collapsed && 'sr-only')}>{t(key)}</span>
              </Link>
            )
          })}

          {isAdmin && (
            <Link
              href={ADMIN_NAV.href}
              title={collapsed ? t('admin') : undefined}
              aria-current={pathname.startsWith(ADMIN_NAV.href) ? 'page' : undefined}
              className={cn(
                'mt-4 flex min-h-11 items-center rounded-control py-2.5 text-sm transition-colors',
                collapsed ? 'justify-center px-0' : 'gap-3 px-3',
                pathname.startsWith('/admin')
                  ? 'bg-elevated font-medium text-fg'
                  : 'text-fg-secondary hover:bg-elevated hover:text-fg',
              )}
            >
              <ADMIN_NAV.icon className="size-4 shrink-0" />
              <span className={cn(collapsed && 'sr-only')}>{t('admin')}</span>
            </Link>
          )}
        </nav>

      </div>
    </aside>
  )
}
