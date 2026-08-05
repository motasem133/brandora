'use client'

import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * A panel that rises from the bottom edge, for a screen with no room beside the
 * work.
 *
 * Built on the native `<dialog>` for the same reason `ConfirmDialog` is: the
 * focus trap, Escape handling, focus restoration, background inertness and the
 * top layer are the platform's, and every hand-rolled version of them in the
 * wild gets at least one wrong.
 *
 * It is modal on purpose. The alternative — a non-modal drawer over the canvas —
 * reads as more flexible and behaves worse on a phone: focus stays behind it,
 * and the thing you are editing is under your thumb.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
}) {
  const ref = React.useRef<HTMLDialogElement>(null)
  const tc = useTranslations('Common')

  React.useEffect(() => {
    const dialog = ref.current
    if (!dialog) return

    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-label={title}
      /*
       * Escape and the backdrop both route through one handler, so React state
       * can never disagree with what the DOM has already done.
       */
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
      className={cn(
        /* Tailwind's preflight sets `margin: auto` on dialog, which centres it;
           this is what pins it to the bottom edge instead. */
        'mb-0 mt-auto w-full max-w-none rounded-t-panel border border-line bg-surface p-0 text-fg',
        'backdrop:bg-black/50 backdrop:backdrop-blur-sm',
        'max-h-[85dvh] overflow-hidden',
        'open:animate-sheet-up',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <p className="font-display font-semibold">{title}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label={tc('close')}
          className="grid size-9 place-items-center rounded-control text-fg-muted transition-colors hover:bg-elevated hover:text-fg"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="max-h-[calc(85dvh-3.5rem)] overflow-y-auto p-5">{children}</div>
    </dialog>
  )
}
