import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

/**
 * A frame with its pin already in it.
 *
 * The one element the board's direction turns on, and the reason it is a
 * component rather than a variant of the locked panel it replaces.
 *
 * The old treatment named the missing thing, drew a mockup of it and put a
 * lock and a link under it — the same information this shows. It converted
 * nobody: it has been live since 14 August, every account created since has
 * seen it, and not one of them started a checkout. The difference is not the
 * argument, it is the shape. A locked card is a thing you are being kept out
 * of. A pinned frame with nothing on it is a gap in work you already own, and
 * a gap is legible in a way a lock is not.
 *
 * So this is drawn as *ready* rather than as *missing*: the pin is in, the
 * frame is faintly lit from where the pin sits, and the caption states what
 * would hang there in the same voice as every filled sheet beside it. Nothing
 * here is greyed out, because greyed out is the visual language of a control
 * that is broken.
 */
export function EmptyPin({
  title,
  benefit,
  action,
  caption,
  meta,
  price,
  href = '/dashboard/billing',
  className,
}: {
  /** What would hang here. */
  title: string
  /** One line on what it is, in the product's own words. */
  benefit: string
  action: string
  /** The mono line under the frame — the same slot a filled sheet uses. */
  caption: string
  /** What it costs to make, in credits. Right of the caption. */
  meta: string
  /** Which plan carries it, beside the action rather than under a lock. */
  price: string
  href?: string
  className?: string
}) {
  return (
    /*
     * Bounded, not full-bleed.
     *
     * A frame that spans the column reads as a banner, and a banner is the
     * thing this replaced. A sheet has a size, and an empty one has the size of
     * the sheet that would hang there.
     */
    <figure className={cn('group relative m-0 max-w-[34rem]', className)}>
      {/* The pin sits on the frame's edge, not inside it, so the frame reads as
          hung rather than as drawn. */}
      <span
        aria-hidden
        className="absolute -top-[7px] left-1/2 z-10 size-3 -translate-x-1/2 rounded-full"
        style={{
          background:
            'radial-gradient(circle at 34% 30%, color-mix(in srgb, var(--brand-primary) 55%, #fff), var(--brand-primary) 58%, color-mix(in srgb, var(--brand-primary) 70%, #000))',
          boxShadow: '0 1px 1px rgba(60,52,38,.35), 0 4px 8px -2px rgba(60,52,38,.4)',
        }}
      />

      <div
        className={cn(
          'flex min-h-[11rem] flex-col justify-end rounded-card p-6',
          'transition-shadow duration-200 ease-[var(--ease-out-soft)]',
        )}
        style={{
          background: [
            'radial-gradient(85% 130% at 50% -20%, color-mix(in srgb, var(--brand-primary) 10%, transparent), transparent 62%)',
            'repeating-linear-gradient(-45deg, color-mix(in srgb, var(--brand-primary) 5%, transparent) 0 9px, transparent 9px 18px)',
          ].join(','),
          boxShadow: 'inset 0 0 0 1.5px color-mix(in srgb, var(--brand-primary) 32%, transparent)',
        }}
      >
        <h3 className="font-display text-lg font-semibold tracking-[-0.02em] text-fg">{title}</h3>
        <p className="mt-1 max-w-[38ch] text-sm text-fg-secondary">{benefit}</p>

        <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <Link
            href={href}
            className={cn(
              'inline-flex min-h-9 items-center rounded-full border-[1.5px] px-3.5 text-sm font-medium',
              'border-brand accent-text transition-colors duration-150 ease-[var(--ease-out-soft)]',
              'hover:bg-brand hover:text-brand-fg',
            )}
          >
            {action}
          </Link>
          <span className="font-mono text-xs text-fg-muted">{price}</span>
        </p>
      </div>

      {/* The same caption slot every filled sheet uses, so an empty frame reads
          as one more thing on the wall rather than as an advertisement. */}
      <figcaption className="mt-2.5 flex items-baseline gap-2 font-mono text-[11px] uppercase tracking-[0.09em] text-fg-muted">
        <span className="text-fg-secondary">{caption}</span>
        <span className="ms-auto normal-case tracking-[0.04em]">{meta}</span>
      </figcaption>
    </figure>
  )
}
