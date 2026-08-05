'use client'

import { motion, useReducedMotion } from 'motion/react'
import * as React from 'react'

const EASE = [0.16, 1, 0.3, 1] as const

/**
 * A product artifact floating over the hero sky.
 *
 * Each card arrives from below with its own tilt, then drifts on a long, slow
 * loop. The drift periods are deliberately unequal so the group never pulses in
 * unison — synchronised floating reads as a carousel, not as depth.
 */
export function FloatCard({
  children,
  className,
  delay = 0,
  tilt = 0,
  drift = 14,
  duration = 9,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  tilt?: number
  /** Vertical travel in px. Small: this is parallax, not levitation. */
  drift?: number
  duration?: number
}) {
  const reduced = useReducedMotion()

  if (reduced) {
    return (
      <div className={className} style={{ rotate: `${tilt}deg` }}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      data-reveal
      className={className}
      initial={{ opacity: 0, y: 48, rotate: tilt * 2.2, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, rotate: tilt, filter: 'blur(0px)' }}
      transition={{ duration: 1, ease: EASE, delay }}
    >
      <motion.div
        data-reveal
        animate={{ y: [0, -drift, 0] }}
        transition={{ duration, repeat: Infinity, ease: 'easeInOut', delay }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

/** The badge above the headline, arriving first. */
export function HeroBadge({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion()

  return (
    <motion.div
      data-reveal
      initial={reduced ? false : { opacity: 0, y: -10, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.7, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}
