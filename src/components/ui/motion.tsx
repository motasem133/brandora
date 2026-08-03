'use client'

import { motion, useReducedMotion, type Variants } from 'motion/react'
import * as React from 'react'

/**
 * The app's motion vocabulary, as components.
 *
 * Thin client wrappers on purpose: a page stays a Server Component and only
 * the wrapper ships JavaScript, so using motion on a page costs the wrapper
 * rather than the page's whole subtree.
 *
 * Hover and press states are deliberately *not* here — they stay CSS
 * transitions. Animating them in JS would mean a client boundary around every
 * button in the product to reproduce what one line of CSS already does.
 */

const DISTANCE = 14

/**
 * Reduced motion is honoured by collapsing the movement, not by shortening it.
 * `useReducedMotion` reads the same preference the CSS guard does, so the two
 * never disagree.
 */
function useVariants(): Variants {
  const reduced = useReducedMotion()

  return {
    hidden: { opacity: 0, y: reduced ? 0 : DISTANCE },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: reduced ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] },
    },
  }
}

/** One element arriving. `delay` is for a handful of items, not a list. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const variants = useVariants()

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      animate="visible"
      transition={{ delay }}
    >
      {children}
    </motion.div>
  )
}

/**
 * A list that arrives in sequence.
 *
 * The stagger lives on the parent rather than as a delay per child, so adding
 * or reordering items cannot leave a gap in the sequence.
 */
export function Stagger({
  children,
  className,
  each = 0.07,
}: {
  children: React.ReactNode
  className?: string
  each?: number
}) {
  const reduced = useReducedMotion()

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: reduced ? 0 : each } },
      }}
    >
      {children}
    </motion.div>
  )
}

/** A child of Stagger. Inherits the sequence; carries no delay of its own. */
export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const variants = useVariants()

  return (
    <motion.div className={className} variants={variants}>
      {children}
    </motion.div>
  )
}

/**
 * Reveals when it scrolls into view, once.
 *
 * `once` matters: re-animating on every scroll past turns a long page into a
 * flicker gallery, which is the failure mode of scroll animation.
 */
export function RevealOnScroll({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const variants = useVariants()

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
    >
      {children}
    </motion.div>
  )
}
