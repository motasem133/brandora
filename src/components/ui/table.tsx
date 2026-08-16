import { eyebrowClass } from '@/components/ui/eyebrow'
import { cn } from '@/lib/utils'

/**
 * A table of records.
 *
 * Deferred once, when only two of these existed and a primitive for two callers
 * is a worse trade than the duplication. There are four now, and every one of
 * them had written `<th className="p-4 text-start font-medium">` by hand and
 * left out the two things a screen reader needs: a `scope` on the header cells,
 * so a row's values are read against the right column, and a caption saying
 * what the table is a table of.
 *
 * The caption is required rather than optional for that reason. It may be
 * visually hidden — that is what `hideCaption` is for — but it may not be
 * missing.
 */
export function Table({
  caption,
  hideCaption = true,
  className,
  children,
}: {
  caption: string
  hideCaption?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full text-sm', className)}>
        <caption
          className={cn(
            hideCaption ? 'sr-only' : 'pb-3 text-start text-sm text-fg-secondary',
          )}
        >
          {caption}
        </caption>
        {children}
      </table>
    </div>
  )
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      {/* The one place the token cannot be the component: this styles a row so
          its cells inherit, and a `<tr>` may not hold a `<p>`. */}
      <tr className={cn('border-b border-line text-fg-muted', eyebrowClass)}>
        {children}
      </tr>
    </thead>
  )
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-line">{children}</tbody>
}

export function TH({
  align = 'start',
  className,
  ...props
}: Omit<React.ComponentProps<'th'>, 'align'> & { align?: 'start' | 'end' }) {
  return (
    <th
      scope="col"
      className={cn('p-4 font-medium', align === 'end' ? 'text-end' : 'text-start', className)}
      {...props}
    />
  )
}

/** The cell that names its row — the row header, which is why it is a `th`. */
export function TRowHeader({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      scope="row"
      className={cn('p-4 text-start font-normal', className)}
      {...props}
    />
  )
}

export function TD({
  align = 'start',
  className,
  ...props
}: Omit<React.ComponentProps<'td'>, 'align'> & { align?: 'start' | 'end' }) {
  return (
    <td
      className={cn('p-4', align === 'end' ? 'text-end' : 'text-start', className)}
      {...props}
    />
  )
}
