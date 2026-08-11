'use client'

import { useTranslations } from 'next-intl'

import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '/admin', key: 'overview' },
  { href: '/admin/ai', key: 'ai' },
  { href: '/admin/users', key: 'users' },
  { href: '/admin/plans', key: 'plans' },
  { href: '/admin/credits', key: 'credits' },
  { href: '/admin/projects', key: 'projects' },
] as const

export function AdminNav() {
  const t = useTranslations('Admin')
  const tn = useTranslations('Nav')
  const pathname = usePathname()

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      {/* The sections of administration. Getting back to the product is the
          app bar's job now, and was a second link to a destination already in
          it. */}
      <nav aria-label={tn('admin')} className="flex flex-wrap gap-1">
        {LINKS.map(({ href, key }) => {
          const active = href === '/admin' ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex min-h-11 items-center rounded-full px-4 text-sm transition-colors',
                active
                  ? 'control-lit bg-elevated font-medium text-fg shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--brand-primary)_22%,transparent),var(--lit-inset)]'
                  : 'text-fg-secondary hover:bg-elevated/60 hover:text-fg',
              )}
            >
              {t(`nav.${key}`)}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
