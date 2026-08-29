'use client'

import { Check, ChevronUp, LogOut } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import * as React from 'react'

import { usePathname, useRouter } from '@/i18n/navigation'
import { locales } from '@/i18n/routing'
import { resetAnalyticsIdentity } from '@/lib/analytics'
import { authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'

/** What each locale calls itself. A language list in one language is a list
    only half its readers can use. */
const LOCALE_NAME: Record<string, string> = { en: 'English', ar: 'العربية' }

/**
 * Identity, and everything that belongs to it.
 *
 * Lifted out of `app-nav` so the top bar and the sidebar are two placements of
 * one menu rather than two menus that drift.
 *
 * The language row used to be a blind toggle: a row labelled "Language" showing
 * the code of the locale you were *not* using, so the one glyph on it meant the
 * opposite of what the same glyph means everywhere else in the product. It is
 * now two named options with the current one marked, which is the difference
 * between a control you operate and one you gamble on.
 *
 * `<details>` rather than a hand-built popover: the disclosure semantics, the
 * keyboard behaviour and the toggle state are the platform's. What it does not
 * give is dismissal, so that is the only thing added — Escape, and a press
 * anywhere outside it.
 */
export function AccountMenu({
  user,
  plan,
  align = 'down',
}: {
  user: { name: string; email: string }
  /** The plan's name, shown as a badge. Omitted where the caller has not got it. */
  plan?: string
  /** `up` for the sidebar, where the trigger sits at the bottom of the rail. */
  align?: 'up' | 'down'
}) {
  const t = useTranslations('Nav')
  const tc = useTranslations('Common')
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const ref = React.useRef<HTMLDetailsElement>(null)

  React.useEffect(() => {
    function close(event: Event) {
      const el = ref.current
      if (!el?.open) return
      if (event.type === 'keydown' && (event as KeyboardEvent).key !== 'Escape') return
      if (event.type === 'pointerdown' && el.contains(event.target as Node)) return

      el.open = false
      // Escape returns the caret to the control that opened the menu; a press
      // outside it is already somewhere else and must not be pulled back.
      if (event.type === 'keydown') el.querySelector('summary')?.focus()
    }

    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [])

  /* The account's own initial, which is the one piece of identity that survives
     being drawn at 28px. */
  const initial = (user.name || user.email).trim().charAt(0).toUpperCase()
  const up = align === 'up'

  return (
    <details ref={ref} className="group/menu relative">
      <summary
        aria-label={t('account')}
        className={cn(
          'flex cursor-pointer list-none items-center rounded-control text-sm transition-colors [&::-webkit-details-marker]:hidden',
          up
            ? 'min-h-11 gap-2.5 px-2 hover:bg-surface/70 group-open/menu:bg-surface/70'
            : 'size-9 justify-center',
        )}
      >
        <Avatar initial={initial} />
        {up && (
          <>
            <span className="min-w-0 flex-1 truncate text-start font-medium text-fg">
              {user.name}
            </span>
            <ChevronUp className="size-4 shrink-0 text-fg-muted transition-transform duration-200 group-open/menu:rotate-180" />
          </>
        )}
      </summary>

      <div
        className={cn(
          'animate-scale-in absolute z-40 w-[17rem]',
          up
            ? 'bottom-[calc(100%+0.5rem)] start-0 origin-bottom-left rtl:origin-bottom-right'
            : 'end-0 top-[calc(100%+0.5rem)] origin-top-right rtl:origin-top-left',
        )}
      >
        {/*
          A raised surface, not a lit one. `lit` / `lit-inner` / `bloom` drew the
          Darkroom's horizon and are dead in the app; depth here is the same
          two-layer cast shadow and specular edge every other lifted thing uses.
        */}
        <div className="overflow-hidden rounded-card border border-line bg-surface shadow-[var(--shadow-lifted),var(--lit-inset)]">
          <div className="flex items-center gap-3 p-3.5">
            <Avatar initial={initial} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-fg">{user.name}</p>
              <p className="truncate text-xs text-fg-muted">{user.email}</p>
            </div>
            {plan && (
              <span className="shrink-0 rounded-full bg-elevated px-2 py-0.5 text-[0.6875rem] font-semibold text-fg-secondary ring-1 ring-line">
                {plan}
              </span>
            )}
          </div>


          <Section label={tc('language')}>
            {locales.map((code) => (
              <Choice
                key={code}
                active={code === locale}
                /*
                  A real navigation, not a soft replace. Changing locale changes
                  <html>'s lang, dir and font stack, and a client re-render of
                  the document element throws away the imperative attribute
                  carrying the theme — so switching language used to throw
                  anyone on the light theme back to dark. Reloading lets the
                  theme script run again.
                */
                onClick={() => {
                  if (code === locale) return
                  window.location.assign(`/${code}${pathname}${window.location.search}`)
                }}
                icon={
                  <span className="grid size-4 place-items-center font-mono text-[0.6875rem] font-medium uppercase">
                    {code}
                  </span>
                }
                label={LOCALE_NAME[code] ?? code}
              />
            ))}
          </Section>

          <div className="border-t border-line p-1.5">
            <button
              type="button"
              onClick={async () => {
                await authClient.signOut()
                // Otherwise the next person on this browser inherits the last
                // one's identity, and their events land on a stranger's profile.
                resetAnalyticsIdentity()
                router.push('/login')
                router.refresh()
              }}
              className="flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-control px-2.5 text-sm font-medium text-fg-secondary transition-colors hover:bg-elevated hover:text-danger"
            >
              <LogOut className="size-4" />
              {tc('signOut')}
            </button>
          </div>
        </div>
      </div>
    </details>
  )
}

function Avatar({ initial, size = 'sm' }: { initial: string; size?: 'sm' | 'lg' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center rounded-full font-semibold text-brand-fg',
        'bg-[image:var(--brand-gradient)] shadow-[var(--shadow-primary)]',
        size === 'lg' ? 'size-9 text-sm' : 'size-7 text-xs',
      )}
    >
      {initial}
    </span>
  )
}

/** A labelled group of mutually exclusive choices. */
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-line p-1.5">
      <p className="px-2.5 pb-1 pt-1.5 text-[0.6875rem] font-semibold text-fg-muted">{label}</p>
      {children}
    </div>
  )
}

/**
 * One choice, with the current one marked by a tick as well as by weight.
 *
 * The tick is the part that matters: a row that differs from its neighbour only
 * by being slightly darker is a state nobody can read at a glance, and it is the
 * whole reason these were blind toggles before.
 */
function Choice({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-control px-2.5 text-sm transition-colors',
        active ? 'bg-elevated font-semibold text-fg' : 'text-fg-secondary hover:bg-elevated/70 hover:text-fg',
      )}
    >
      <span className={cn('shrink-0', active && 'text-accent')}>{icon}</span>
      <span className="flex-1 text-start">{label}</span>
      {active && <Check className="size-4 shrink-0 text-accent" />}
    </button>
  )
}
