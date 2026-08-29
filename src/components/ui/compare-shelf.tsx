'use client'

import { Columns2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

export type ShelfItem = { id: string; src: string; label: string }

/**
 * A shelf of sheets you can take down — one to look at, or two to compare.
 *
 * The product's first principle is that the kit must agree with itself, and
 * until now nothing on this page let anyone check. Eight posts at 180 pixels
 * shows you that eight files exist; whether the third and the seventh look like
 * the same brand is a question you can only answer by putting them next to each
 * other at a size worth judging.
 *
 * Two modes on one grid rather than two controls. Off, a press holds one sheet
 * up. On, a press picks — and the second pick opens both, side by side, at
 * which point the mode has done its job and turns itself off. Nobody has to
 * remember they are in a mode, because the mode ends when the question is
 * answered.
 */
export function CompareShelf({
  items,
  compareLabel,
  compareHint,
  holdLabel,
  className,
}: {
  items: ShelfItem[]
  compareLabel: string
  /** Said while picking, so the mode explains itself rather than being guessed. */
  compareHint: string
  /** `{what}` is filled with the sheet's own label. */
  holdLabel: (what: string) => string
  className?: string
}) {
  const [comparing, setComparing] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const [held, setHeld] = useState<string[]>([])
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    /* `showModal`, not the `open` attribute: `open` opens a dialog
       non-modally, which loses the backdrop and the focus containment that are
       the whole reason this is a dialog. */
    if (held.length && !dialog.open) dialog.showModal()
    if (!held.length && dialog.open) dialog.close()
  }, [held])

  function press(id: string) {
    if (!comparing) {
      setHeld([id])
      return
    }
    const next = picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]
    if (next.length === 2) {
      setHeld(next)
      setPicked([])
      setComparing(false)
      return
    }
    setPicked(next)
  }

  const shown = items.filter((item) => held.includes(item.id))

  return (
    <div className={className}>
      {items.length > 1 && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setComparing((on) => !on)
              setPicked([])
            }}
            aria-pressed={comparing}
            className={cn(
              'inline-flex min-h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium',
              'transition-colors duration-150 ease-[var(--ease-out-soft)]',
              comparing
                ? 'border-brand bg-brand text-brand-fg'
                : 'border-line text-fg-secondary hover:bg-elevated hover:text-fg',
            )}
          >
            <Columns2 className="size-4" />
            {compareLabel}
          </button>
          {comparing && <span className="text-sm text-fg-secondary">{compareHint}</span>}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => {
          const order = picked.indexOf(item.id)
          return (
            <figure key={item.id} className="relative m-0 space-y-2">
              <button
                type="button"
                onClick={() => press(item.id)}
                aria-pressed={comparing ? order >= 0 : undefined}
                aria-label={comparing ? item.label : holdLabel(item.label)}
                className={cn(
                  'block w-full rounded-control transition-transform duration-200 ease-[var(--ease-out-soft)]',
                  comparing ? 'cursor-copy' : 'cursor-zoom-in',
                  'hover:-translate-y-0.5 focus-visible:-translate-y-0.5',
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.src}
                  alt={item.label}
                  loading="lazy"
                  className={cn(
                    'w-full rounded-control border bg-white object-contain transition-shadow',
                    order >= 0 ? 'border-brand shadow-[var(--shadow-lifted)]' : 'border-line',
                  )}
                />
              </button>

              {/* The pick reads as an order, not a tick: which two, and which
                  goes on the left when they open. */}
              {order >= 0 && (
                <span
                  aria-hidden
                  className="absolute end-2 top-2 grid size-6 place-items-center rounded-full bg-brand text-xs font-semibold text-brand-fg"
                >
                  {order + 1}
                </span>
              )}

              <figcaption className="truncate text-xs font-medium">{item.label}</figcaption>
            </figure>
          )
        })}
      </div>

      <dialog
        ref={ref}
        onClose={() => setHeld([])}
        aria-label={shown.map((item) => item.label).join(' · ')}
        className={cn(
          'm-auto max-h-[92dvh] max-w-[96vw] overflow-visible bg-transparent p-0',
          'backdrop:bg-[color-mix(in_srgb,var(--bg-base)_86%,#000)] backdrop:backdrop-blur-[2px]',
          'open:animate-scale-in',
        )}
      >
        <div
          className="grid min-h-[92dvh] min-w-[96vw] place-items-center p-6"
          onClick={() => setHeld([])}
        >
          <div
            className={cn(
              'flex items-center justify-center gap-5',
              shown.length > 1 ? 'flex-col sm:flex-row' : 'flex-col',
            )}
            onClick={(event) => event.stopPropagation()}
          >
            {shown.map((item) => (
              <figure key={item.id} className="m-0 space-y-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.src}
                  alt={item.label}
                  className={cn(
                    'rounded-card bg-white object-contain shadow-[var(--shadow-lifted)]',
                    shown.length > 1 ? 'max-h-[70dvh] max-w-[44vw]' : 'max-h-[80dvh] max-w-[86vw]',
                  )}
                />
                <figcaption className="text-center font-mono text-[11px] uppercase tracking-[0.09em] text-fg-muted">
                  {item.label}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setHeld([])}
          className="absolute end-5 top-5 grid size-10 place-items-center rounded-full bg-surface text-fg-secondary shadow-[var(--shadow-soft)] transition-colors hover:text-fg"
        >
          <X className="size-5" />
          <span className="sr-only">{compareLabel}</span>
        </button>
      </dialog>
    </div>
  )
}
