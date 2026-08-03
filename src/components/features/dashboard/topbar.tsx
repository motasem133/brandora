'use client'

import { LogOut, Moon, Plus, Sun } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'


import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import { Link, usePathname, useRouter } from '@/i18n/navigation'
import { resetAnalyticsIdentity } from '@/lib/analytics'
import { authClient } from '@/lib/auth-client'
import { toggleTheme } from '@/lib/theme'
import { locales } from '@/i18n/routing'

export function Topbar({ user }: { user: { name: string; email: string } }) {
  const t = useTranslations('Nav')
  const tc = useTranslations('Common')
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocale()

  const otherLocale = locales.find((l) => l !== locale) ?? 'en'

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b border-line bg-base/80 px-6 backdrop-blur lg:px-10">
      <Link href="/dashboard" className="lg:hidden">
        <Logo className="text-lg" markClassName="size-6" />
      </Link>

      <div className="ms-auto flex items-center gap-2">
        <Button size="sm" onClick={() => router.push('/onboarding')}>
          <Plus />
          <span className="hidden sm:inline">{t('newProject')}</span>
        </Button>

        {/* Locale switch preserves the current path. */}
        <Button
          variant="ghost"
          size="icon"
          aria-label={tc('language')}
          onClick={() => router.replace(pathname, { locale: otherLocale })}
        >
          <span className="text-xs font-semibold uppercase">{otherLocale}</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          aria-label={tc('theme')}
          onClick={() => toggleTheme()}
        >
          <Sun className="icon-when-dark" />
          <Moon className="icon-when-light" />
        </Button>

        <div className="hidden text-end sm:block">
          <p className="text-sm font-medium leading-tight">{user.name}</p>
          <p className="text-xs leading-tight text-fg-muted">{user.email}</p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          aria-label={tc('signOut')}
          onClick={async () => {
            await authClient.signOut()
            // Otherwise the next person on this browser inherits the last
            // one's identity, and their events land on a stranger's profile.
            resetAnalyticsIdentity()
            router.push('/login')
            router.refresh()
          }}
        >
          <LogOut />
        </Button>
      </div>
    </header>
  )
}
