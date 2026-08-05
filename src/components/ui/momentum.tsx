'use client'

import { animate, motion, useMotionValue, useReducedMotion } from 'motion/react'
import * as React from 'react'

/**
 * Momentum hover: a card that answers with the physics of the flick.
 *
 * A hover state that plays the same animation every time tells the visitor
 * nothing except that the element is hoverable. This one is a function of how
 * the pointer actually arrived — direction, speed, and which side of centre it
 * crossed — so flicking a card from the left throws it right and spins it one
 * way, and coming in slowly from below barely disturbs it.
 *
 * The throw is a spring to the card's own resting position carrying an initial
 * velocity, which is the same shape as an inertia tween: the card leaves, runs
 * out of energy, and comes home. No decay plugin needed for that.
 *
 * The two-element split is not decorative. The outer wrapper holds the pointer
 * listener and never moves; only the inner element is transformed. A single
 * element would slide out from under the cursor, fire `mouseleave`, slide back,
 * fire `mouseenter`, and flick itself forever.
 */

type Velocity = { x: number; y: number; at: number }

const FieldContext = React.createContext<React.RefObject<Velocity> | null>(null)

/** A pointer that stopped this long ago is at rest, whatever it was doing before. */
const STALE_MS = 90

/** Ceilings on the throw, so a frantic pointer cannot launch a card off the page. */
const clampThrow = (value: number) => Math.max(-900, Math.min(900, value))
const clampSpin = (value: number) => Math.max(-200, Math.min(200, value))

/** Loose enough to travel, damped enough to land once rather than wobble. */
const THROW = { type: 'spring', stiffness: 190, damping: 17, mass: 0.9, restDelta: 0.05 } as const
const SPIN = { type: 'spring', stiffness: 150, damping: 15, restDelta: 0.02 } as const

/**
 * Shares one pointer-velocity reading with every card inside it.
 *
 * Measured here rather than per card because a card only learns the pointer's
 * velocity at the instant it is entered — by which time there is no history to
 * measure it from.
 *
 * Listened for on the window rather than on this element, which is the whole
 * point of the distinction. A pointer entering a card from outside the grid
 * fires `mouseover` before the first `mousemove` the grid would ever see, so a
 * grid-scoped listener knows nothing about the movement that brought the
 * pointer in — and the first card approached from off the grid, the common
 * case, would be the one card that never responds.
 */
export function MomentumField({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const velocity = React.useRef<Velocity>({ x: 0, y: 0, at: 0 })

  React.useEffect(() => {
    let last: { x: number; y: number; at: number } | null = null

    const track = (event: PointerEvent) => {
      const at = performance.now()
      const previous = last
      last = { x: event.clientX, y: event.clientY, at }

      if (!previous) return

      const elapsed = at - previous.at
      if (elapsed <= 0) return

      // Pixels per second, so the numbers mean something independent of frame
      // rate — a 240Hz display should not throw cards a quarter as far.
      velocity.current = {
        x: ((event.clientX - previous.x) / elapsed) * 1000,
        y: ((event.clientY - previous.y) / elapsed) * 1000,
        at,
      }
    }

    window.addEventListener('pointermove', track, { passive: true })
    return () => window.removeEventListener('pointermove', track)
  }, [])

  return (
    <FieldContext.Provider value={velocity}>
      <div className={className}>{children}</div>
    </FieldContext.Provider>
  )
}

/**
 * One card in the field.
 *
 * `throwGain` and `spinGain` scale the pointer's velocity into travel and
 * rotation. They are the whole tuning surface: a marketing tile can afford to
 * be flung, a card in the product should barely lean.
 */
export function MomentumItem({
  children,
  className,
  throwGain = 0.25,
  spinGain = 0.05,
}: {
  children: React.ReactNode
  className?: string
  throwGain?: number
  spinGain?: number
}) {
  const field = React.useContext(FieldContext)
  const reduced = useReducedMotion()
  const anchor = React.useRef<HTMLDivElement>(null)

  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotate = useMotionValue(0)

  const flick = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const element = anchor.current
      if (!element || !field || reduced) return

      // Touch reports a single jump from nowhere to the tap point, which reads
      // as an enormous velocity and throws the card across the screen.
      if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

      const { x: velocityX, y: velocityY, at } = field.current
      if (performance.now() - at > STALE_MS) return

      /*
       * Measured on the wrapper, not on the element being moved: a card caught
       * mid-throw would otherwise report a displaced centre and compute its
       * spin from a lever arm that no longer exists.
       */
      const box = element.getBoundingClientRect()
      const offsetX = event.clientX - (box.left + box.width / 2)
      const offsetY = event.clientY - (box.top + box.height / 2)

      /*
       * Torque about the centre — the cross product of where the pointer
       * entered and where it was heading. Dividing by the lever arm normalises
       * it, so the spin follows how fast the pointer crossed rather than how
       * far off-centre it happened to do it.
       */
      const lever = Math.hypot(offsetX, offsetY) || 1
      const twist = (offsetX * velocityY - offsetY * velocityX) / lever

      animate(x, 0, { ...THROW, velocity: clampThrow(velocityX * throwGain) })
      animate(y, 0, { ...THROW, velocity: clampThrow(velocityY * throwGain) })
      animate(rotate, 0, { ...SPIN, velocity: clampSpin(twist * spinGain) })
    },
    [field, reduced, rotate, spinGain, throwGain, x, y],
  )

  if (reduced) return <div className={className}>{children}</div>

  return (
    <div ref={anchor} className={className} onMouseEnter={flick}>
      {/*
        `will-change` is promised on the way in and released on the way out,
        rather than declared for the life of the page. Left on, it held a
        compositor layer per card — eleven of them on the dashboard alone, each
        costing memory for a transform that only runs during a hover flick.
      */}
      <motion.div
        style={{ x, y, rotate }}
        className="h-full"
        onMouseEnter={(event) => {
          event.currentTarget.style.willChange = 'transform'
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.willChange = 'auto'
        }}
      >
        {children}
      </motion.div>
    </div>
  )
}
