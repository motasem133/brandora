import * as React from 'react'

import { cn } from '@/lib/utils'

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'min-h-28 w-full resize-y rounded-lg border border-line bg-surface px-3.5 py-3 text-sm text-fg',
        'placeholder:text-fg-muted transition-colors',
        'focus:border-brand focus:outline-none',
        'aria-[invalid=true]:border-danger',
        className,
      )}
      {...props}
    />
  )
}
