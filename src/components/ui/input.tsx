import * as React from 'react'

import { cn } from '@/lib/utils'

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-lg border border-line bg-surface px-3.5 text-sm text-fg',
        'placeholder:text-fg-muted transition-colors',
        'focus:border-brand focus:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-[invalid=true]:border-danger',
        className,
      )}
      {...props}
    />
  )
}
