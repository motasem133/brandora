'use client'

import * as React from 'react'

import { useFieldProps } from '@/components/ui/field'
import { cn } from '@/lib/utils'

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  const wired = useFieldProps(props)

  return (
    <textarea
      className={cn(
        'field-lit min-h-28 w-full resize-y rounded-control border border-line bg-elevated/60 px-3.5 py-3 text-sm text-fg transition-shadow duration-200',
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
