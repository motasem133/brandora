'use client'

import { useTranslations } from 'next-intl'

import { ADMIN_NAV, NAV, isNavActive } from '@/components/features/dashboard/nav-items'
import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

/**
 * The rail, laid on its side.
 *
 * Below `lg` the side rail is hidden, and for a while nothing replaced it:
 * Billing, Settings and the projects list existed in the DOM with no rendered
 * box, so a customer on a phone could not top up credits, change plan or verify
 * their email. This is the row DESIGN.md already prescribed for that width.
 *
 * It is a row rather than a bottom bar on purpose. The destinations here are
 * chrome for a document — you arrive at a brand and stay in it — so the
 * navigation belongs with the header it continues, not floating over the work
 * as a permanent fifth of the screen on the smallest devices the product has.
 */
export function MobileNav({ isAdmin }: { isAdmin: boolean }) {
  const t = useTranslations('Nav')
  const pathname = usePathname()

  const items = isAdmin ? [...NAV, ADMIN_NAV] : NAV

  return (
    <nav
      aria-label={t('sections')}
      /*
       * Sticky beneath the 4rem topbar rather than scrolling away with the
       * page: the reason to reach for navigation is usually "this isn't what I
       * wanted", which happens after you have scrolled.
       */
      className="glass sticky top-16 z-10 border-b border-line lg:hidden"
    >
      {/* The bleed lets the row scroll edge to edge while its items keep the
          page's own gutter. */}
      <div className="flex gap-1 overflow-x-auto px-6 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map(({ href, key, icon: Icon }) => {
          const active = isNavActive(pathname, href)

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                /*
                 * The rail marks the active row with a rule on its start edge
                 * that grows from nothing. Turned ninety degrees, that rule is
                 * an underline — same gesture, same 200ms, so the two
                 * navigations read as one thing at two widths.
                 */
                'group relative flex min-h-11 shrink-0 items-center gap-2 rounded-control px-3 text-sm transition-all duration-200',
                'after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-brand after:transition-transform after:duration-200 after:content-[""]',
                active
                  ? 'bg-[image:linear-gradient(100deg,color-mix(in_oklch,var(--brand-primary)_22%,transparent),transparent_70%)] font-medium text-fg shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--brand-primary)_20%,transparent)] after:scale-x-100'
                  : 'text-fg-secondary after:scale-x-0 hover:bg-elevated hover:text-fg',
              )}
            >
              <Icon className="size-4 shrink-0" />
              {t(key)}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
