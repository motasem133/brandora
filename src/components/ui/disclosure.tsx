import { ChevronDown } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * A section folded shut until it is wanted.
 *
 * Native `<details>`, deliberately: it costs no JavaScript, it survives a
 * find-in-page, and the browser gives it keyboard and screen-reader behaviour
 * that a div with an onClick would have to reimplement badly.
 *
 * `open` is passed as an initial state rather than tracked — React writes the
 * attribute once and the browser owns it from there, which is what makes an
 * uncontrolled disclosure behave.
 */
export function Disclosure({
  title,
  meta,
  open,
  className,
  children,
}: {
  title: React.ReactNode
  /** A count or a hint, kept beside the chevron rather than in the title. */
  meta?: React.ReactNode
  open?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <details
      open={open}
      className={cn(
        'group rounded-card border border-line bg-surface/60 px-5 py-4 transition-colors open:bg-surface sm:px-7 sm:py-5',
        className,
      )}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
        <span className="font-display text-base font-semibold sm:text-lg">{title}</span>
        <span className="flex shrink-0 items-center gap-2.5 text-xs text-fg-muted">
          {meta}
          <ChevronDown className="size-4 transition-transform duration-200 group-open:rotate-180" />
        </span>
      </summary>

      <div className="mt-5">{children}</div>
    </details>
  )
}
