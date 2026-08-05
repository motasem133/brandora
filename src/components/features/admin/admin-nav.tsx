'use client'

import { ArrowLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '/admin', key: 'overview' },
  { href: '/admin/ai', key: 'ai' },
  { href: '/admin/users', key: 'users' },
  { href: '/admin/plans', key: 'plans' },
  { href: '/admin/projects', key: 'projects' },
] as const

export function AdminNav() {
  const t = useTranslations('Admin')
  const pathname = usePathname()

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <nav className="flex flex-wrap gap-1">
        {LINKS.map(({ href, key }) => {
          const active = href === '/admin' ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'rounded-control px-3 py-2 text-sm transition-colors',
                active ? 'bg-elevated font-medium text-fg' : 'text-fg-secondary hover:text-fg',
              )}
            >
              {t(`nav.${key}`)}
            </Link>
          )
        })}
      </nav>

      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-fg-secondary hover:text-fg"
      >
        <ArrowLeft className="size-3.5 rtl:rotate-180" />
        {t('backToApp')}
      </Link>
    </div>
  )
}
