import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * A state, not a control.
 *
 * The pill used to carry that distinction on its own. Now that every control in
 * the product is a pill too, the shape says nothing and the light says
 * everything: a Badge is a flat wash — no fill gradient, no halo, no lit edges,
 * no border, no hover — and a Button always has a source. See the Lit Control
 * Rule in DESIGN.md.
 *
 * The two supporting tells are deliberate and worth keeping: 12px text against
 * a control's 14px, and a height that comes from its padding rather than from
 * the 36px floor a control has to clear to be pressable.
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
  {
    variants: {
      tone: {
        neutral: 'bg-elevated text-fg-secondary',
        brand: 'bg-brand/15 accent-text',
        success: 'bg-success/15 text-success',
        warning: 'bg-warning/15 text-warning',
        danger: 'bg-danger/15 text-danger',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

export function Badge({
  className,
  tone,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />
}
