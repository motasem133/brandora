'use client'

import { motion, useInView, useReducedMotion } from 'motion/react'
import * as React from 'react'

/**
 * The page handing itself to a brand it generated.
 *
 * This is the landing page's one authored moment, and it is the argument rather
 * than an effect. The product sells coherence — one brief, one identity, every
 * piece agreeing with the others — and the strongest way to say that on a
 * marketing page is to stop describing the output and let it take the room. So
 * the kit section is already drawn in Sultana's own paper and ink through
 * `.world-light`, and this lifts the chrome off it as the visitor arrives.
 *
 * A veil rather than a class swap, and that is the whole trick. `.world-light`
 * re-points every token at once, so toggling it on scroll would snap: ground,
 * ink, borders and accent would all change on a single frame. A chrome-coloured
 * sheet fading out over the finished section gives a true cross-fade, costs one
 * animated opacity, and cannot desynchronise from the tokens underneath because
 * it never touches them.
 *
 * **A sentinel, not `whileInView` on the veil.** The veil covers the whole
 * section, and the section is tall enough that its box is already intersecting
 * the viewport when the page loads — so `whileInView` fired at scroll zero and
 * the handover was over before anyone could see it. The trigger is a zero-height
 * marker at the section's top edge instead, held until it has risen well into
 * the viewport, which is the moment the visitor is actually looking at it.
 */
export function GuestHandover({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion()
  const sentinel = React.useRef<HTMLDivElement>(null)
  /*
   * `-65%` off the bottom, measured rather than guessed: the section's top edge
   * sits at ~504px in a 900px viewport, so anything looser than this is already
   * inside the band at scroll zero and the handover plays before the page has
   * been touched. This keeps the trigger in the top third, which is the point
   * at which the section is genuinely what the visitor is looking at.
   */
  const arrived = useInView(sentinel, { once: true, margin: '0px 0px -65% 0px' })

  return (
    <div className="relative">
      <div ref={sentinel} aria-hidden className="absolute inset-x-0 top-0 h-px" />

      {children}

      {/*
        Reduced motion gets the destination, not a frozen halfway state: the
        section is simply already the brand's, with no veil rendered at all.
      */}
      {!reduced && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10"
          /*
            Two reasons this is an inline style rather than a utility. `bg-base`
            is deliberately not registered — a Tailwind colour named `base`
            compiles `.text-base` into a colour instead of a font size. And the
            veil has to resolve the *chrome* ground: inside `.world-light`,
            `--bg-base` is re-pointed at `--guest-paper`, so a veil rendered
            within the scope would paint the brand's own paper over the brand
            and fade nothing. It sits outside the scoped section for exactly
            that reason.
          */
          style={{ background: 'var(--bg-base)' }}
          initial={{ opacity: 1 }}
          animate={{ opacity: arrived ? 0 : 1 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        />
      )}
    </div>
  )
}
