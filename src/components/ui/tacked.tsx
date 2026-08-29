import { cn } from '@/lib/utils'

/**
 * Anything on the wall, hung.
 *
 * The pin and the caption are the wall's two constants, and they belong here
 * rather than inside each sheet: a specimen wears its own brand's paper and a
 * pin must not, so the pin sits on the frame's edge in Brandora's violet while
 * everything below it is the customer's. That separation is the whole reason
 * the room is neutral — it is also why this is the only place on a wall surface
 * the accent appears.
 *
 * The caption is the sheet's own label, in the machine's voice, in the slot an
 * empty frame uses too. A filled sheet and a gap read as the same kind of
 * object because they are captioned the same way.
 */
export function Tacked({
  children,
  caption,
  meta,
  className,
}: {
  children: React.ReactNode
  /** What this is, in the label voice. Omit for a sheet that names itself. */
  caption?: string
  /** The figure at the end of the caption — a count, a size, a cost. */
  meta?: string
  className?: string
}) {
  return (
    <figure className={cn('relative m-0', className)}>
      <span
        aria-hidden
        className="absolute -top-[7px] left-1/2 z-10 size-3 -translate-x-1/2 rounded-full"
        style={{
          background:
            'radial-gradient(circle at 34% 30%, color-mix(in srgb, var(--brand-primary) 55%, #fff), var(--brand-primary) 58%, color-mix(in srgb, var(--brand-primary) 70%, #000))',
          boxShadow: '0 1px 1px rgba(60,52,38,.35), 0 4px 8px -2px rgba(60,52,38,.4)',
        }}
      />

      {children}

      {caption && (
        <figcaption className="mt-2.5 flex items-baseline gap-2 font-mono text-[11px] uppercase tracking-[0.09em] text-fg-muted">
          <span className="text-fg-secondary">{caption}</span>
          {meta && <span className="ms-auto normal-case tracking-[0.04em]">{meta}</span>}
        </figcaption>
      )}
    </figure>
  )
}
