'use client'

import { CreditCard, LayoutDashboard, Settings, Shield, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/dashboard', key: 'overview', icon: LayoutDashboard },
  { href: '/dashboard/projects', key: 'projects', icon: Sparkles },
  { href: '/dashboard/billing', key: 'billing', icon: CreditCard },
  { href: '/dashboard/settings', key: 'settings', icon: Settings },
] as const

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const t = useTranslations('Nav')
  const pathname = usePathname()

  return (
    <aside className="hidden w-60 shrink-0 border-e border-line bg-surface lg:block">
      <div className="sticky top-0 flex h-dvh flex-col p-4">
        <Link href="/dashboard" className="mb-8 px-2 font-display text-xl font-bold gradient-text">
          Brandora
        </Link>

        <nav className="flex flex-col gap-1">
          {NAV.map(({ href, key, icon: Icon }) => {
            // Exact match for the index route, prefix match for the rest, so
            // /dashboard doesn't stay highlighted on /dashboard/projects.
            const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href)

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                  active
                    ? 'bg-elevated font-medium text-fg'
                    : 'text-fg-secondary hover:bg-elevated hover:text-fg',
                )}
              >
                <Icon className="size-4 shrink-0" />
                {t(key)}
              </Link>
            )
          })}

          {isAdmin && (
            <Link
              href="/admin"
              className={cn(
                'mt-4 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                pathname.startsWith('/admin')
                  ? 'bg-elevated font-medium text-fg'
                  : 'text-fg-secondary hover:bg-elevated hover:text-fg',
              )}
            >
              <Shield className="size-4 shrink-0" />
              {t('admin')}
            </Link>
          )}
        </nav>
      </div>
    </aside>
  )
}
