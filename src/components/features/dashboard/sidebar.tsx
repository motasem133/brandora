'use client'

import { CreditCard, LayoutDashboard, Settings, Shield, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Logo } from '@/components/ui/logo'
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
    <aside className="relative z-10 hidden w-60 shrink-0 border-e border-line bg-surface/60 backdrop-blur-xl lg:block">
      <div className="sticky top-0 flex h-dvh flex-col p-4">
        <Link href="/dashboard" className="mb-8 px-2">
          <Logo className="text-xl" markClassName="size-7" animated />
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
                  /*
                   * The left rule is the active marker: it grows from nothing
                   * on the item you moved to, so the eye follows the change
                   * instead of hunting for which row changed shade.
                   */
                  'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200',
                  'before:absolute before:inset-y-2 before:-start-1 before:w-0.5 before:rounded-full before:bg-brand before:transition-transform before:duration-200 before:content-[""]',
                  active
                    ? 'bg-[image:linear-gradient(100deg,color-mix(in_oklch,var(--brand-primary)_22%,transparent),transparent_70%)] font-medium text-fg shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--brand-primary)_20%,transparent)] before:scale-y-100'
                    : 'text-fg-secondary before:scale-y-0 hover:bg-elevated hover:text-fg',
                )}
              >
                <Icon className="size-4 shrink-0 transition-transform duration-200 group-hover:scale-110" />
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
