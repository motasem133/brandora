import { cn } from '@/lib/utils'

import { Link } from '@/i18n/navigation'

/**
 * A choice between a few mutually exclusive views of the same thing.
 *
 * Six of these existed — currency, date range, device, page, section — built
 * from the same `inline-flex rounded-lg border border-line p-0.5` markup, and
 * exactly one of them named itself to assistive technology. The rest announced
 * a row of anonymous buttons, so a screen-reader user could hear "USD" and
 * "AED" without ever being told what they set.
 *
 * The label is required for that reason. It is the one thing every copy of this
 * forgot, and the one thing a component can guarantee.
 *
 * No roving focus: these hold two to five items and Tab reaches each of them in
 * order. A roving tabindex would be the right call at ten, and would be wrong
 * to add speculatively here.
 */
export function SegmentedControl({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('inline-flex rounded-control border border-line p-0.5', className)}
    >
      {children}
    </div>
  )
}

const item =
  'rounded-[calc(var(--radius-control)-0.25rem)] px-3 py-1.5 text-xs font-medium transition-colors'
const selected = 'bg-elevated text-fg'
const unselected = 'text-fg-secondary hover:text-fg'

/**
 * A segment that is a destination. The choice lives in the URL, so the view is
 * server-rendered and the page is shareable with the choice already applied.
 */
export function SegmentedLink({
  href,
  active,
  className,
  children,
}: {
  href: string
  active: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? 'page' : undefined}
      className={cn(item, active ? selected : unselected, className)}
    >
      {children}
    </Link>
  )
}

/** A segment that is a setting, held in client state. */
export function SegmentedButton({
  active,
  onClick,
  label,
  className,
  children,
}: {
  active: boolean
  onClick: () => void
  /** Required when the segment shows only an icon. */
  label?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={cn(item, active ? selected : unselected, className)}
    >
      {children}
    </button>
  )
}
