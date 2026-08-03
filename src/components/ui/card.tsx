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

export function CardTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return <h3 className={cn('font-display text-lg font-semibold text-fg', className)} {...props} />
}

export function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-sm text-fg-secondary', className)} {...props} />
}
