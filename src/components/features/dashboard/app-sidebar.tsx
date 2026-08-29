'use client'

import { Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { AccountMenu } from '@/components/features/dashboard/account-menu'
import { ADMIN_NAV, NAV, isNavActive } from '@/components/features/dashboard/nav-items'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import { Link, usePathname, useRouter } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

/**
 * The app's navigation, down the left, from `lg` up.
 *
 * This restores a rail the product deliberately removed, so the reversal is
 * recorded rather than left to look like drift. The bar replaced the rail
 * because the client's supplied reference put its own product's destinations
 * across the top; the rail comes back because the approved comp for the world
 * that replaced the board puts them down the side, and because the objection
 * that retired it no longer holds. That objection was DESIGN.md's rule against
 * a persistent rail holding less than a screen of content — written when the
 * rail held four destinations and a toggle. It now holds six, a grouped
 * account section and the credit meter, which is the one number every run
 * spends and the thing a customer most often wants before they start.
 *
 * What the bar did well survives unchanged. The destinations are still defined
 * once in `nav-items`, so a seventh cannot reach the rail and miss the phone;
 * the active item is still marked by more than a shade; the labels are still
 * labels rather than bare glyphs at every width; and the whole small-screen
 * presentation is still `AppNav`, which keeps the scrolling row, its fades and
 * its centring. This is an addition above `lg`, not a rewrite of that work.
 */
export function AppSidebar({
  user,
  isAdmin,
  credits,
  monthlyCredits,
  brandsLeft,
  brandCost,
  plan,
}: {
  user: { name: string; email: string }
  isAdmin: boolean
  plan: string
  credits: number
  monthlyCredits: number
  brandsLeft: number
  /** What a full brand costs, already formatted. */
  brandCost: string
}) {
  const t = useTranslations('Nav')
  const pathname = usePathname()
  const router = useRouter()

  const items = isAdmin ? [...NAV, ADMIN_NAV] : NAV
  /* Account destinations sit under their own heading so the product's own three
     are not read as a list of six equal things. */
  const account = new Set<string>(['/dashboard/billing', '/dashboard/settings', '/admin'])
  const product = items.filter((item) => !account.has(item.href))
  const personal = items.filter((item) => account.has(item.href))

  /*
   * A meter needs a ceiling, and an organization with no subscription has none.
   * Rather than invent one, the bar is dropped and the balance stands alone —
   * a full-looking bar on an account that cannot refill is a lie about money.
   */
  const hasCeiling = monthlyCredits > 0
  const filled = hasCeiling ? Math.min(100, Math.round((credits / monthlyCredits) * 100)) : 0

  /*
   * `z-20`, above the content panel's `z-10`.
   *
   * The account menu carries its own `z-40`, and that was not enough: z-index
   * only orders siblings inside one stacking context, and a `sticky` element at
   * `z-auto` does not open one. So the menu's 40 was competing inside the rail's
   * own level, which sits *below* the panel's 10 — and the popover opened
   * underneath the dashboard instead of over it.
   */
  return (
    <aside className="sticky top-0 z-20 hidden h-dvh w-60 shrink-0 flex-col gap-1 p-5 lg:flex">
      <Link href="/dashboard" className="mb-5 px-2" aria-label={t('overview')}>
        <Logo className="text-lg" markClassName="size-7" />
      </Link>

      <Button size="sm" className="mb-4 w-full" onClick={() => router.push('/onboarding')}>
        <Plus />
        {t('newProject')}
        {/* PRODUCT.md: anything that can spend a customer's credits says so at
            the control that spends them. */}
        <span className="font-normal opacity-70">· {brandCost}</span>
      </Button>

      <nav aria-label={t('sections')} className="flex flex-col gap-0.5">
        {product.map(({ href, key, icon }) => (
          <RailItem key={href} href={href} icon={icon} label={t(key)} pathname={pathname} />
        ))}

        <p className="px-3 pt-5 pb-2 text-xs font-semibold text-fg-muted">{t('accountGroup')}</p>

        {personal.map(({ href, key, icon }) => (
          <RailItem key={href} href={href} icon={icon} label={t(key)} pathname={pathname} />
        ))}
      </nav>

      <div className="flex-1" />

      {/*
        The balance, and what it is actually worth.

        A raw number is a fact a customer has to do arithmetic on before it means
        anything, and PRODUCT.md is explicit that plans are sold in credits while
        surfaces still show what a balance buys. `brandsFrom` is the one place
        that rate lives, so this cannot drift from the pricing page.
      */}
      <Link
        href="/dashboard/billing"
        className="rounded-card bg-surface p-4 shadow-[var(--shadow-soft),var(--lit-inset)] transition-shadow hover:shadow-[var(--shadow-lifted)]"
      >
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-fg-secondary">{t('credits')}</span>
          <span className="font-semibold tabular-nums">
            {credits}
            {hasCeiling && (
              <span className="ms-1 text-xs font-medium text-fg-muted">
                {t('creditsOf', { total: monthlyCredits })}
              </span>
            )}
          </span>
        </div>

        {hasCeiling && (
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-elevated shadow-[inset_0_1px_2px_color-mix(in_srgb,var(--text-primary)_9%,transparent)]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,var(--brand-primary),var(--brand-indigo))]"
              style={{ width: `${filled}%` }}
            />
          </div>
        )}

        {/* Two facts on two rows. As one sentence joined by a separator, "Top
            up" wrapped onto its own line at this rail width and read as a
            stranded fragment rather than as the link it is. */}
        <p className="mt-2.5 text-xs leading-snug text-fg-muted">
          {t('creditsWorth', { count: brandsLeft })}
        </p>
        <p className="mt-1 text-xs font-semibold text-accent">{t('topUp')}</p>
      </Link>

      <div className="mt-3 px-1">
        <AccountMenu user={user} plan={plan} align="up" />
      </div>
    </aside>
  )
}

/**
 * One destination.
 *
 * The active one is a raised surface: the panel fill, a real cast shadow and
 * the specular top edge every lifted thing in this world carries, with the
 * accent on its icon. Shape and light rather than a shade change alone, which
 * is what makes it findable at a glance in either theme.
 */
function RailItem({
  href,
  icon: Icon,
  label,
  pathname,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  pathname: string
}) {
  const active = isNavActive(pathname, href)

  return (
    <Link
      href={href}
      /* Every destination is a dynamic route, so the ordinary prefetch fetches
         nothing useful. Hovering pulls the whole page instead. */
      unstable_dynamicOnHover
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex min-h-10 items-center gap-3 rounded-control px-3 text-sm transition-all duration-200',
        active
          ? 'bg-surface font-semibold text-fg shadow-[var(--shadow-soft),var(--lit-inset)]'
          : 'text-fg-secondary hover:bg-surface/60 hover:text-fg',
      )}
    >
      <Icon
        className={cn('size-[1.15rem] shrink-0 transition-transform duration-200', active ? 'text-accent' : 'group-hover:scale-110')}
      />
      {label}
    </Link>
  )
}
