'use client'

import { motion, useReducedMotion } from 'motion/react'
import * as React from 'react'

/**
 * The parts of the page that behave like objects rather than like layout.
 *
 * Everything else on this page arrives by fading and rising — the vocabulary of
 * a document. These pieces arrive by being dealt, dropped and pushed, which is
 * the vocabulary of things on a table. Used sparingly and only where the
 * visitor is looking at an artifact, it is the difference between a page that
 * presents work and a page that hands it over.
 */

/** The overshoot that makes something read as landing rather than as arriving. */
const ELASTIC = { type: 'spring', visualDuration: 0.55, bounce: 0.5 } as const
const SETTLE = { type: 'spring', visualDuration: 0.4, bounce: 0.35 } as const

/**
 * Scatter, decided by index rather than by `Math.random()`.
 *
 * These components render on the server too, and a random tilt would be a
 * different tilt in the HTML than in the hydrated tree.
 *
 * Rounded for the same reason: the server writes the transform as a string and
 * rounds it on the way, so an angle carrying sixteen decimal places hydrates as
 * a mismatch against the value the client computes.
 */
function jitter(index: number, spread: number) {
  const noise = Math.sin((index + 1) * 12.9898) * 43758.5453
  return Math.round((noise - Math.floor(noise) - 0.5) * 2 * spread * 100) / 100
}

/**
 * The palette, dealt onto the card.
 *
 * The swatches drop in crooked and straighten as they land, one after another.
 * A palette is the one deliverable a visitor grasps without reading anything,
 * so it is worth the half second it takes to watch it being laid out.
 */
export function PaletteDeal({ colors, className }: { colors: string[]; className?: string }) {
  const reduced = useReducedMotion()

  return (
    <div className={className}>
      {colors.map((hex, index) => (
        <motion.div
          data-reveal
          key={hex}
          className="flex-1 rounded-card"
          style={{ backgroundColor: hex }}
          initial={reduced ? false : { opacity: 0, y: 30, rotate: jitter(index, 9) }}
          whileInView={{ opacity: 1, y: 0, rotate: 0 }}
          viewport={{ once: true, margin: '-12% 0px' }}
          transition={{ ...ELASTIC, delay: reduced ? 0 : index * 0.07 }}
        />
      ))}
    </div>
  )
}

/**
 * A row that parts around the pointer.
 *
 * The hovered pill lifts and holds still; its neighbours step aside by an
 * amount that falls off with distance, so the row opens around the cursor
 * rather than reacting one item at a time. It is the cheapest possible way to
 * make a static list of names feel like it is being handled.
 *
 * The `<li>` never moves — only the pill inside it does. A displaced element
 * that carries its own pointer listener leaves and re-enters itself, and the
 * row shakes itself apart.
 */
export function PillFan({ items, className }: { items: string[]; className?: string }) {
  const reduced = useReducedMotion()
  const [active, setActive] = React.useState<number | null>(null)

  /** How far the immediate neighbour steps aside. Everything else follows from it. */
  const SPREAD = 14

  const offset = (index: number) => {
    if (active === null || active === index) return 0
    return SPREAD / (index - active)
  }

  /*
    The sequence is a delay per item rather than a `staggerChildren` variant on
    the row. An inherited variant label resolves through framer's string-building
    SSR path, which serialises the initial style differently than the client
    computes it on hydration — and React calls that a mismatch.
  */
  return (
    <ul className={className} onMouseLeave={() => setActive(null)}>
      {items.map((item, index) => (
        <motion.li
          data-reveal
          key={item}
          initial={reduced ? false : { opacity: 0, y: 14, rotate: jitter(index, 7) }}
          whileInView={{ opacity: 1, y: 0, rotate: 0 }}
          viewport={{ once: true, margin: '-12% 0px' }}
          transition={{ ...ELASTIC, delay: reduced ? 0 : index * 0.035 }}
          onMouseEnter={reduced ? undefined : () => setActive(index)}
        >
          <motion.span
            data-reveal
            className="block rounded-full border border-line px-3 py-1.5 text-xs text-fg-secondary transition-colors"
            /*
             * The reference marks the one card that matters with its accent on
             * the hairline and nothing else — no fill, no badge. Same here.
             * This was `rgba(167,139,250,0.5)`, a literal of the tint the ramp
             * used before it was re-anchored, over hand-mixed white borders.
             */
            style={{
              borderColor:
                active === index
                  ? 'color-mix(in srgb, var(--brand-primary) 55%, transparent)'
                  : undefined,
            }}
            animate={{
              x: offset(index),
              scale: active === index ? 1.08 : 1,
              y: active === index ? -2 : 0,
            }}
            transition={SETTLE}
          >
            {item}
          </motion.span>
        </motion.li>
      ))}
    </ul>
  )
}

/**
 * A marker that drops into place.
 *
 * Scaled from nothing and rotated, so it reads as being set down on the rail
 * rather than as fading in next to it. It lands straight: the reference this
 * borrows from lets everything settle crooked, which suits a sticker and does
 * not suit a numbered sequence a visitor is meant to read in order.
 */
export function StepMark({
  children,
  className,
  index,
}: {
  children: React.ReactNode
  className?: string
  index: number
}) {
  const reduced = useReducedMotion()

  return (
    <motion.span
      data-reveal
      className={className}
      /*
       * Starts small rather than at nothing, and the margin below is vertical.
       *
       * These five numbers silently stopped appearing when the section around
       * them widened. `margin: '-18%'` is a `rootMargin`, so it insets the
       * observation box on all four sides — at 1440px that is 259px off each
       * edge — and moving this column to the left of that inset meant the marks
       * could never intersect it, whatever the scroll position. The words and
       * the rail beside them were unaffected, because they sit further in.
       *
       * Vertical-only keeps what the margin was for: fire once the mark is
       * properly on screen, not the instant its first pixel is. The 0.35 floor
       * is belt and braces — a zero-area box is a poor thing to hand an
       * observer regardless.
       */
      initial={reduced ? false : { scale: 0.35, rotate: -20, y: -16 }}
      whileInView={{ scale: 1, rotate: 0, y: 0 }}
      viewport={{ once: true, margin: '-18% 0px' }}
      transition={{ ...ELASTIC, delay: reduced ? 0 : Math.min(index * 0.04, 0.2) }}
    >
      {children}
    </motion.span>
  )
}
