'use client'

import { ChevronDown } from 'lucide-react'
import * as React from 'react'

import { useFieldProps } from '@/components/ui/field'
import { cn } from '@/lib/utils'

/**
 * The native select, dressed to match `Input`.
 *
 * Both selects in the product were hand-rolled and neither was labelled — one
 * in the onboarding wizard over the whole country list, one in settings. They
 * also disagreed with `Input` about their own ground (`bg-surface` against
 * `bg-elevated/60`) and carried no focus glow, so the two controls in the same
 * form looked like they came from different products.
 *
 * Native on purpose: a phone renders its own wheel, a screen reader knows the
 * role without being told, and type-ahead works. The chevron is decoration over
 * the top, and the appearance reset is what lets it be.
 */
export function Select({ className, children, ...props }: React.ComponentProps<'select'>) {
  const wired = useFieldProps(props)

  return (
    <div className="relative">
      <select
        className={cn(
          'field-lit h-11 w-full appearance-none rounded-control border border-line bg-elevated/60 pe-10 ps-3.5 text-sm text-fg',
          'transition-shadow duration-200',
          'focus:border-brand focus:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'aria-[invalid=true]:border-danger',
          className,
        )}
        {...wired}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute end-3.5 top-1/2 size-4 -translate-y-1/2 text-fg-muted"
      />
    </div>
  )
}
