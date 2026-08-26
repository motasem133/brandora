'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

/**
 * Take it down and hold it up.
 *
 * The gesture the wall is named for: a sheet comes off the board, the room
 * recedes, and one artefact is judged on its own. It is the physical thing
 * anyone who has ever pinned work up already does, and it is the only honest
 * answer to a page that shows eight designed posts at 180 pixels each — at that
 * size a customer is checking that files exist, not looking at them.
 *
 * A native `<dialog>` rather than a portal and a focus trap. It carries Escape,
 * focus containment, inertness of the page behind it and a backdrop for free,
 * and every one of those is a thing hand-rolled overlays in this product would
 * have to get right separately. `showModal()` is called from an effect rather
 * than rendered as an attribute, because `open` on a dialog opens it
 * *non*-modally — the one detail that makes the element look broken.
 */
export function HoldUp({
  children,
  label,
  className,
  frameClassName,
}: {
  /** The artefact, at whatever size it is held at. */
  children: React.ReactNode
  /** What is being held up, for the button and the dialog. */
  label: string
  className?: string
  frameClassName?: string
}) {
  const [held, setHeld] = useState(false)
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (held && !dialog.open) dialog.showModal()
    if (!held && dialog.open) dialog.close()
  }, [held])

  /* The dialog's own close paths — Escape, and the form method — have to reach
     our state or the next click reopens nothing. */
  const drop = useCallback(() => setHeld(false), [])

  return (
    <>
      <button
        type="button"
        onClick={() => setHeld(true)}
        aria-label={label}
        className={cn(
          'group/hold block w-full cursor-zoom-in rounded-control text-start',
          'transition-transform duration-200 ease-[var(--ease-out-soft)]',
          'hover:-translate-y-0.5 focus-visible:-translate-y-0.5',
          className,
        )}
      >
        {children}
      </button>

      <dialog
        ref={ref}
        onClose={drop}
        aria-label={label}
        /*
         * The board, not a scrim. A modal over a wall should read as the room
         * going quiet, so the backdrop is the ground's own colour at depth
         * rather than the black wash every overlay defaults to.
         */
        className={cn(
          'm-auto max-h-[92dvh] max-w-[92vw] overflow-visible bg-transparent p-0',
          'backdrop:bg-[color-mix(in_srgb,var(--bg-base)_86%,#000)] backdrop:backdrop-blur-[2px]',
          'open:animate-scale-in',
        )}
      >
        {/* Clicking the ground drops it back, the way putting a sheet down does.
            The artefact stops the click so a press on the work itself does not. */}
        <div
          className="grid min-h-[92dvh] min-w-[92vw] place-items-center p-6"
          onClick={drop}
        >
          <div
            className={cn('cursor-zoom-out', frameClassName)}
            onClick={(event) => event.stopPropagation()}
          >
            {children}
          </div>
        </div>
      </dialog>
    </>
  )
}
