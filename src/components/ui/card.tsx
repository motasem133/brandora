import * as React from 'react'

import { cn } from '@/lib/utils'

export function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('surface-card p-7', className)} {...props} />
}

export function CardTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return <h3 className={cn('font-display text-lg font-semibold text-fg', className)} {...props} />
}

export function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-sm text-fg-secondary', className)} {...props} />
}
