'use client'

import { LogOut, Moon, Plus, Sun } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import * as React from 'react'

import { ADMIN_NAV, NAV, isNavActive } from '@/components/features/dashboard/nav-items'
import { Button } from '@/components/ui/button'
import { Logo, LogoMark } from '@/components/ui/logo'
import { Link, usePathname, useRouter } from '@/i18n/navigation'
import { locales } from '@/i18n/routing'
import { resetAnalyticsIdentity } from '@/lib/analytics'
import { authClient } from '@/lib/auth-client'
import { toggleTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

/**
 * The app's navigation, along the top.
 *
 * It was a collapsing left rail. The reference the client supplied shows its
 * own product with a horizontal bar — mark at the start, destinations across
 * the middle, identity and one lit call to action at the end — and that is the
 * shape this product wanted anyway: DESIGN.md's own rule against a persistent
 * rail holding less than a screen of content was written about four items and a
 * toggle, and the answer to it here was a rail that hid itself on the one route
 * where it was most in the way.
 *
 * What the rail did well survives. The destinations are still defined once in
 * `nav-items`, so a fifth one cannot reach the wide bar and miss the narrow
 * row; the active item is still marked by more than a shade; and the labels are
 * still labels at every width rather than bare glyphs.
 */
export function AppNav({
  user,
  isAdmin,
  credits,
}: {
  user: { name: string; email: string }
  isAdmin: boolean
  credits: number
}) {
  const t = useTranslations('Nav')
  const pathname = usePathname()
  const router = useRouter()

  const items = isAdmin ? [...NAV, ADMIN_NAV] : NAV

  /*
   * Bring the current destination into view on the small-screen row.
   *
   * Five destinations — six for an admin — are about six hundred pixels of
   * pills, and a phone is three hundred and ninety. Billing, Settings and Admin
   * therefore sat off the end of a row that starts at Overview, so the two
   * things a visitor needs from navigation were both missing: where they are,
   * and what else there is. Anyone on Settings saw a row of other people's
   * pages with nothing marked.
   *
   * Centred rather than merely scrolled to, so the neighbours on both sides
   * come with it — which is the part that says the row continues.
   */
  const railRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    railRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({
      inline: 'center',
      // Never vertically: this row is inside a sticky header, and pulling the
      // page down to "reveal" something already on screen is a jump nobody asked
      // for.
      block: 'nearest',
    })
  }, [pathname])

  return (
    <header className="sticky top-0 z-30">
      {/*
        The bar is frosted rather than filled, so the bloom on the panel beneath
        it reaches through instead of stopping at a hard edge — which is what
        the reference's own header does over its arc.
      */}
      <div className="glass relative">
        <div className="mx-auto flex h-16 max-w-[90rem] items-center gap-4 px-6 lg:px-10">
          {/*
            Three columns, the outer two sharing the leftover evenly.

            The centre used to be `absolute left-1/2`, which centres it on the
            page and takes it out of the layout entirely — so it could not push
            the cluster on the end, it could only be drawn over it. With the
            Admin link present the row needed about 1400px, and below that
            "Admin" was printed on top of the credits pill: at 1280px they
            overlapped by 62px, at 1024px by 190px. Nothing errored and no
            breakpoint was crossed, which is why it survived.

            Two `flex-1` rails are the same centring — equal rails put the
            middle on the page's centre, and it stays symmetric in Arabic
            without a mirrored rule — except that everything is in flow, so a
            row that no longer fits gets tight instead of stacking on itself.
          */}
          <div className="flex min-w-fit flex-1 items-center">
            <Link href="/dashboard" className="shrink-0" aria-label={t('overview')}>
              <Logo className="hidden text-xl sm:inline-flex" markClassName="size-12" />
              <LogoMark className="size-12 sm:hidden" />
            </Link>
          </div>

          {/*
            `xl`, not `lg` — the breakpoint is now where the row actually fits.

            It appeared from 1024px and needed about 1400px with the Admin link
            present, which is the whole defect: the bar was shown at widths it
            had never fitted in. Measured on the real thing, 1280px clears both
            edges with the sixth item in place, so that is where it starts.
            Below it the stacked row underneath takes over — which is designed
            for exactly this, fades at both ends and scrolls the current
            destination to the centre, none of which a squeezed bar does.

            The overflow rules stay as a floor rather than a plan. Arabic sets
            these labels longer, and a seventh destination is one commit away;
            when either happens this gives up space by scrolling instead of
            printing one label over another.
          */}
          <nav
            aria-label={t('sections')}
            className="hidden min-w-0 items-center gap-1 overflow-x-auto [mask-image:linear-gradient(to_right,transparent,#000_1rem,#000_calc(100%-1rem),transparent)] [scrollbar-width:none] xl:flex [&::-webkit-scrollbar]:hidden"
          >
            {items.map(({ href, key, icon: Icon }) => (
              <NavItem
                key={href}
                href={href}
                icon={Icon}
                label={t(key)}
                active={isNavActive(pathname, href)}
              />
            ))}
          </nav>

          {/*
            `min-w-fit`, so this rail never shrinks below what is in it.

            With `min-w-0` it shrank happily and its contents overflowed
            leftward across the nav — the same overlap by a different route.
            The nav is the only thing here that can give up space gracefully,
            because it is the only thing that scrolls.
          */}
          <div className="flex min-w-fit flex-1 items-center justify-end gap-2">
            {/*
              The balance, where the reference keeps its notifications.

              Credits are this product's money and every run spends them, so the
              number a customer needs before they start is worth a permanent
              place — and it is a link to the page that tops it up rather than a
              badge, because reading it is nearly always the first half of
              wanting more of it.
            */}
            <Link
              href="/dashboard/billing"
              className="control-lit hidden h-9 items-center gap-2 rounded-full border border-line px-3.5 text-sm transition-colors hover:bg-elevated sm:inline-flex"
            >
              <span className="text-fg-muted">{t('credits')}</span>
              <span className="font-semibold tabular-nums">{credits}</span>
            </Link>

            {/*
              The label stays at every width. Collapsed to a bare `+`, the
              product's primary action is an unlabelled glyph on exactly the
              screens where a first-time visitor is least able to guess at it —
              and this bar is now the only place it appears, so there is no
              second, labelled copy further down the page to fall back on.
            */}
            <Button size="sm" onClick={() => router.push('/onboarding')}>
              <Plus />
              {t('newProject')}
            </Button>

            <AccountMenu user={user} />
          </div>
        </div>

        {/* The rule stops before the edges, like the marketing page's. */}
        <div aria-hidden className="rule-fade" />
      </div>

      {/*
        The same navigation, laid out as a scrollable row where the bar has no
        room for it. Sticky beneath the header rather than scrolling away: the
        reason to reach for navigation is usually "this isn't what I wanted",
        which happens after you have scrolled.
      */}
      <nav aria-label={t('sections')} className="glass border-b border-line xl:hidden">
        {/*
          The row fades out at both ends instead of stopping dead at them.

          A hidden scrollbar with a hard edge is indistinguishable from a row
          that simply ends, so the destinations past the fold read as not
          existing. The mask makes the last pill dissolve rather than get cut,
          which is the whole of the affordance — and it is symmetric, so it says
          the same thing in Arabic without a mirrored rule.

          `scroll-smooth` and `snap` are deliberately absent: this row is
          centred programmatically on every navigation, and snapping would fight
          that by re-settling on whichever pill happened to be nearest.
        */}
        <div
          ref={railRef}
          /* The padding has to be wider than the fade, or the first and last
             pills — which is where the active one ends up, since centring
             cannot centre an end — are dissolved by the very thing that exists
             to say there is more beyond them. 24px of padding, 16px of fade. */
          className="flex gap-1 overflow-x-auto px-6 py-2 [mask-image:linear-gradient(to_right,transparent,#000_1rem,#000_calc(100%-1rem),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map(({ href, key, icon: Icon }) => (
            <NavItem
              key={href}
              href={href}
              icon={Icon}
              label={t(key)}
              active={isNavActive(pathname, href)}
            />
          ))}
        </div>
      </nav>
    </header>
  )
}

/**
 * One destination.
 *
 * The active one is a lit pill: the elevated fill, an inset accent hairline,
 * and the same bottom edge every control in the product carries. That edge is
 * the marker — a shade change alone is what makes someone hunt for which item
 * moved, and a shade change plus light is legible at a glance in either theme.
 */
function NavItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      /* These are the app's tabs and every one of them is a dynamic route, so
         the ordinary prefetch fetches nothing useful. Hovering — or the touch
         that precedes the tap — pulls the whole page instead. */
      unstable_dynamicOnHover
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm transition-all duration-200',
        active
          ? 'control-lit bg-elevated font-medium text-fg shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--brand-primary)_22%,transparent),var(--lit-inset)]'
          : 'text-fg-secondary hover:bg-elevated/60 hover:text-fg',
      )}
    >
      <Icon className="size-4 shrink-0 transition-transform duration-200 group-hover:scale-110" />
      {label}
    </Link>
  )
}

/**
 * Identity, and everything that belongs to it.
 *
 * The bar used to carry the account's name, its email, a language switch, a
 * theme switch and a sign-out control as five separate objects, which left the
 * end of the header holding more items than the middle. They are all still one
 * press away; they are just no longer competing with the product's own
 * navigation for the same forty pixels.
 *
 * `<details>` rather than a hand-built popover: the disclosure semantics, the
 * keyboard behaviour and the toggle state are the platform's. What it does not
 * give is dismissal, so that is the only thing added — Escape, and a press
 * anywhere outside it.
 */
function AccountMenu({ user }: { user: { name: string; email: string } }) {
  const t = useTranslations('Nav')
  const tc = useTranslations('Common')
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const ref = React.useRef<HTMLDetailsElement>(null)

  const otherLocale = locales.find((l) => l !== locale) ?? 'en'

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
     being drawn at 36px. */
  const initial = (user.name || user.email).trim().charAt(0).toUpperCase()

  return (
    <details ref={ref} className="relative">
      <summary
        aria-label={t('account')}
        className="control-lit grid size-9 cursor-pointer list-none place-items-center rounded-full border border-line bg-elevated text-sm font-semibold transition-colors hover:bg-elevated/70 [&::-webkit-details-marker]:hidden"
      >
        {initial}
      </summary>

      <div className="animate-scale-in absolute end-0 top-[calc(100%+0.5rem)] w-64 origin-top-right rtl:origin-top-left">
        <div className="lit shadow-[var(--shadow-lifted)]">
          <div className="lit-inner bloom p-2 [--bloom-size:14rem] [--bloom-strength:14%]">
            <div className="px-3 py-2.5">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-fg-muted">{user.email}</p>
            </div>

            <div aria-hidden className="rule-fade my-1" />

            <MenuItem onClick={() => toggleTheme()}>
              <Sun className="icon-when-dark size-4" />
              <Moon className="icon-when-light size-4" />
              {tc('theme')}
            </MenuItem>

            {/*
              A real navigation, not a soft replace. Changing locale changes
              <html>'s lang, dir and font stack, and a client re-render of the
              document element throws away the imperative attribute carrying the
              theme — so switching language used to throw anyone on the light
              theme back to dark. Reloading lets the theme script run again.
            */}
            <MenuItem
              onClick={() => {
                const query = window.location.search
                window.location.assign(`/${otherLocale}${pathname}${query}`)
              }}
            >
              <span className="grid size-4 place-items-center text-xs font-semibold uppercase">
                {otherLocale}
              </span>
              {tc('language')}
            </MenuItem>

            <MenuItem
              onClick={async () => {
                await authClient.signOut()
                // Otherwise the next person on this browser inherits the last
                // one's identity, and their events land on a stranger's profile.
                resetAnalyticsIdentity()
                router.push('/login')
                router.refresh()
              }}
            >
              <LogOut className="size-4" />
              {tc('signOut')}
            </MenuItem>
          </div>
        </div>
      </div>
    </details>
  )
}

function MenuItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-full px-3 text-sm text-fg-secondary transition-colors hover:bg-elevated hover:text-fg"
    >
      {children}
    </button>
  )
}
