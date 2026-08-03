import * as React from 'react'

import { cn } from '@/lib/utils'

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'min-h-28 w-full resize-y rounded-control border border-line bg-elevated/60 transition-shadow duration-200 focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--brand-primary)_22%,transparent)] px-3.5 py-3 text-sm text-fg',
        'placeholder:text-fg-muted transition-colors',
        'focus:border-brand focus:outline-none',
        'aria-[invalid=true]:border-danger',
        className,
      )}
      {...props}
    />
  )
}
