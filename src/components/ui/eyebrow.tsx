import { cn } from '@/lib/utils'

/**
 * The `label` type token, as a component.
 *
 * DESIGN.md defines a label style — 12px, 600, `0.12em`, uppercase — for the
 * eyebrow above a group of content and for meta keys in a definition list. The
 * primitive named `Label` implements something else entirely (a form field's
 * label, 14px medium), so the token was being hand-rolled as
 * `text-xs font-semibold uppercase tracking-[0.12em]` in four feature files.
 *
 * Deliberately not usable as a heading: this is a label for a group, and the
 * group's heading is a separate element with its own level.
 */
export function Eyebrow({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      className={cn('text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted', className)}
      {...props}
    />
  )
}
