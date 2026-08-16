import { cn } from '@/lib/utils'

/**
 * The `label` type token, as a component.
 *
 * DESIGN.md defines a label style — 12px, 600, `0.12em`, uppercase — for the
 * eyebrow above a group of content and for meta keys in a definition list. The
 * primitive named `Label` implements something else entirely (a form field's
 * label, 14px medium), so the token was being hand-rolled as
 * `text-xs font-semibold uppercase tracking-[0.12em]`.
 *
 * It stayed hand-rolled in ten more places after this component existed, which
 * is the failure worth naming: a token nobody imports is a token that drifts.
 * The reason it went unused was in its own first draft — it rendered a `<p>` and
 * nothing else, while six of those ten sites are the heading of a real section
 * and two are a `<dt>`. A component that cannot be the element the call site
 * needs will lose to a copied string every time, so the element is now a prop.
 *
 * Restricted to the elements this token legitimately takes. `as` does not decide
 * whether something is a heading — the call site's place in the document does,
 * and passing `h2` here is a claim that it opens a section. The type stops that
 * claim being made by accident, and the string it applies stays in one place.
 *
 * Not to be confused with `type-eyebrow` in globals.css, which is the *machine*
 * voice — mono, wider tracking, its own Arabic behaviour — for run keys and
 * timings. Two tokens on purpose; see the note above that utility.
 */

/**
 * The token itself, for the two or three places that cannot mount a component —
 * a `<tr>` styling its cells, chiefly. Prefer `<Eyebrow>`.
 */
export const eyebrowClass = 'text-xs font-semibold uppercase tracking-[0.12em]'

type EyebrowElement = 'p' | 'span' | 'dt' | 'h2' | 'h3' | 'h4'

export function Eyebrow({
  as: Component = 'p',
  className,
  ...props
}: React.ComponentProps<'p'> & { as?: EyebrowElement }) {
  return <Component className={cn(eyebrowClass, 'text-fg-muted', className)} {...props} />
}
