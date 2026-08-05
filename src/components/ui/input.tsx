'use client'

import * as React from 'react'

import { useFieldProps } from '@/components/ui/field'
import { cn } from '@/lib/utils'

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  // Inside a `Field`, the id, description and invalid state arrive on their
  // own; anything passed explicitly still wins.
  const wired = useFieldProps(props)

  return (
    <input
      className={cn(
        'field-lit h-11 w-full rounded-control border border-line bg-elevated/60 px-3.5 text-sm text-fg transition-shadow duration-200',
        'placeholder:text-fg-muted transition-colors',
        'focus:border-brand focus:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-[invalid=true]:border-danger',
        className,
      )}
      {...wired}
    />
  )
}
