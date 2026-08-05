import { useId } from 'react'
import { cn } from '@/lib/utils'

/**
 * The Brandora mark.
 *
 * Inline SVG rather than an <img> for three reasons: it inherits the page's
 * gradient tokens instead of baking a colour, it costs no request, and the
 * sparkles can be animated independently of the letterform.
 *
 * The gradient id is namespaced per instance — two marks on one page with the
 * same id would both resolve to whichever defs block rendered first, which is
 * how a logo silently loses its colour in a header that also has a footer.
 */
export function LogoMark({
  className,
  id,
  animated = false,
}: {
  className?: string
  id?: string
  /** Sparkles drift and shimmer. For hero use, not for a 24px header icon. */
  animated?: boolean
}) {
  /*
   * The default was the string 'brandora', which is not per-instance at all —
   * the sidebar mark and the topbar mark both emitted
   * `id="brandora-mark-gradient"`, so the document carried a duplicate id and
   * both marks resolved to whichever defs block rendered first. `useId` makes
   * the namespacing the comment above claims.
   */
  const reactId = useId()
  const gradientId = `${id ?? reactId}-mark-gradient`

  return (
    <svg
      viewBox="0 0 100 100"
      className={cn('size-8', className)}
      role="img"
      aria-label="Brandora"
    >
      <defs>
        <linearGradient id={gradientId} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="var(--brand-primary)" />
          <stop offset="1" stopColor="var(--brand-secondary)" />
        </linearGradient>
      </defs>

      <g fill={`url(#${gradientId})`}>
        <path
          fillRule="evenodd"
          d="M38 11h24c14 0 24 9 24 21 0 7-3 13-9 16 7 4 11 10 11 18 0 13-10 22-26 22H38V11zm16 15v13h8c5 0 8-2 8-6.5S67 26 62 26h-8zm0 27v16h10c6 0 10-3 10-8s-4-8-10-8H54z"
        />
        <path
          className={animated ? 'logo-sparkle' : undefined}
          d="M26 28c2.4 13.2 8.4 19.2 21.6 21.6C34.4 52 28.4 58 26 71.2 23.6 58 17.6 52 4.4 49.6 17.6 47.2 23.6 41.2 26 28z"
        />
        <path
          className={animated ? 'logo-sparkle logo-sparkle-delayed' : undefined}
          d="M21 6c1.1 6.2 3.9 9 10.1 10.1C24.9 17.2 22.1 20 21 26.2 19.9 20 17.1 17.2 10.9 16.1 17.1 15 19.9 12.2 21 6z"
        />
      </g>
    </svg>
  )
}

/** Mark plus wordmark, the lockup used in headers and the auth screens. */
export function Logo({
  className,
  markClassName,
  animated = false,
  id,
}: {
  className?: string
  markClassName?: string
  animated?: boolean
  id?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark className={markClassName} animated={animated} id={id} />
      <span className="font-display font-bold accent-text">Brandora</span>
    </span>
  )
}
