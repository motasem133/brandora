'use client'

import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * A confirmation the product owns, instead of one the browser draws.
 *
 * `window.confirm` was doing this job. It is functional and it is free, but it
 * renders in the operating system's voice rather than the product's: no theme,
 * no Arabic direction, no room to say what is about to be lost, and on some
 * platforms a modal that steals the whole window. For an action that destroys a
 * customer's brand, the last thing they read before agreeing should not look
 * like a page error.
 *
 * Built on the native `<dialog>` element rather than a portal-and-listeners
 * stack: the platform already implements the parts that are easy to get wrong —
 * focus is trapped inside while open and restored to the trigger on close,
 * `Escape` dismisses, the rest of the page is inert to assistive tech, and the
 * backdrop is a real pseudo-element rather than a div that has to guess at
 * z-index.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel,
  cancelLabel,
  destructive = false,
  pending = false,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  /** A node, not a string, so a confirmation can carry a link out of itself. */
  body: ReactNode
  confirmLabel: string
  cancelLabel: string
  /** Colours the confirm control and nothing else; the copy carries the weight. */
  destructive?: boolean
  pending?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return

    /*
     * `showModal()` rather than the `open` attribute. Only the modal form gets
     * the top layer, the backdrop, the focus trap and the inert background —
     * setting `open` renders a dialog that looks right and behaves like an
     * ordinary div.
     */
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      /* Esc and backdrop dismissal are the platform's; both route back through
         the same close handler so state cannot drift from the DOM. */
      onCancel={(event) => {
        event.preventDefault()
        if (!pending) onClose()
      }}
      onClick={(event) => {
        // A click on the dialog's own box never has the dialog as its target;
        // only the backdrop does. That is the whole click-outside test.
        if (event.target === ref.current && !pending) onClose()
      }}
      aria-labelledby="confirm-title"
      aria-describedby="confirm-body"
      className={cn(
        /*
         * `m-auto` restores centring. The user-agent stylesheet centres a modal
         * dialog with `margin: auto`, and Tailwind's preflight resets margin to
         * 0 on every element — so without this the dialog renders pinned to the
         * top-left corner of the viewport.
         */
        'm-auto w-[min(28rem,calc(100vw-2rem))] rounded-panel border border-line bg-surface p-0 text-fg',
        'shadow-[var(--shadow-lifted)] backdrop:bg-[color-mix(in_srgb,var(--bg-base)_72%,transparent)]',
        'backdrop:backdrop-blur-sm open:animate-scale-in',
      )}
    >
      <div className="p-6">
        <h2 id="confirm-title" className="font-display text-lg font-semibold tracking-[-0.02em]">
          {title}
        </h2>
        <div id="confirm-body" className="mt-2 text-sm leading-relaxed text-fg-secondary">
          {body}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
            disabled={pending}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
