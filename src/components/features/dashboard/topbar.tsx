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
    <header className="glass sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b border-line px-6 lg:px-10">
      {/*
        The mark stands in for the rail between `sm` and `lg`, and steps aside
        on the narrowest phones: with the primary action carrying its label
        again, the header ran five pixels past a 390px viewport, and this link
        was the one thing in it that duplicated a destination — the row below
        already carries Overview, labelled, with the same icon.
      */}
      <Link href="/dashboard" className="hidden sm:block lg:hidden">
        <Logo className="text-lg" markClassName="size-6" />
      </Link>

      <div className="ms-auto flex items-center gap-2">
        {/*
          The label stays at every width. Collapsed to a bare `+`, the product's
          primary action was an unlabelled glyph on exactly the screens where a
          first-time visitor is least able to guess at it.
        */}
        <Button size="sm" onClick={() => router.push('/onboarding')}>
          <Plus />
          {t('newProject')}
        </Button>

        {/*
          Locale switch preserves the current path, as a real navigation.

          It used to be a soft `router.replace`, which changes `lang` and `dir`
          on <html> and makes React re-render the document element on the
          client. That reset every imperative attribute on it — including the
          one carrying the theme — so anyone on the light theme was thrown back
          to dark by changing language, and React additionally warned about
          meeting the theme <script> during a client render.

          A document whose language, direction and font stack all change is a
          new document. Reloading it lets the theme script run again, which is
          what makes the theme survive and the warning disappear. Locale
          switching is rare; correctness is worth the reload.
        */}
        <Button
          variant="ghost"
          size="icon"
          aria-label={tc('language')}
          onClick={() => {
            const query = window.location.search
            window.location.assign(`/${otherLocale}${pathname}${query}`)
          }}
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
