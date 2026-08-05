import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * The app's panel.
 *
 * Two elements rather than one: the outer carries a gradient edge lit from
 * above, the inner carries the surface. A single bordered box cannot do that,
 * and the border is what made every screen read as a template.
 */
export function Card({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className="lit shadow-[var(--shadow-soft)]" {...props}>
      <div className={cn('lit-inner p-7', className)}>{children}</div>
    </div>
  )
}

/**
 * A card's heading.
 *
 * It was an `h3` under a page's `h1`, with no `h2` in between — a skipped level
 * on eight routes, which is what a screen reader's "list the headings" turns
 * into a hole. A card is nearly always a section of its page, so `h2` is the
 * honest default; `level={3}` is there for the cards that genuinely sit inside
 * a section that already has one.
 */
export function CardTitle({
  className,
  level = 2,
  ...props
}: React.ComponentProps<'h2'> & { level?: 2 | 3 }) {
  const Heading = level === 3 ? 'h3' : 'h2'
  return (
    <Heading className={cn('font-display text-lg font-semibold text-fg', className)} {...props} />
  )
}

export function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-sm text-fg-secondary', className)} {...props} />
}
