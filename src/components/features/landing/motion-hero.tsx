'use client'

import { motion, useReducedMotion } from 'motion/react'
import * as React from 'react'

/**
 * The page's authored moment: the light arrives, then the words do.
 *
 * Motion here is on load, not on scroll. The previous version put every
 * entrance behind a scroll trigger, which meant the first viewport — the only
 * one most visitors see — was completely static.
 */

const EASE = [0.16, 1, 0.3, 1] as const

/**
 * The headline rises a word at a time, unblurring as it lands.
 *
 * Words rather than characters: character animation on a headline this size
 * reads as a typewriter gimmick, and it breaks Arabic, where letterforms join.
 */
/**
 * A headline arriving a word at a time.
 *
 * It renders a `<span>`, not the heading itself: the heading is the caller's,
 * because the sentence it belongs to is longer than this clause — and while
 * this owned the `<h1>`, wrapping it in the real one nested a heading inside a
 * heading, which is invalid and cost a hydration error on every load.
 */
export function HeadlineWords({ text, className }: { text: string; className?: string }) {
  const reduced = useReducedMotion()
  const words = text.split(' ')

  if (reduced) return <span className={className}>{text}</span>

  return (
    <span className={className}>
      {words.map((word, index) => (
        <motion.span
          data-reveal
          key={`${word}-${index}`}
          className="inline-block"
          initial={{ opacity: 0, y: '0.5em', filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.75, ease: EASE, delay: 0.06 * index }}
        >
          {word}
          {index < words.length - 1 && ' '}
        </motion.span>
      ))}
    </span>
  )
}

/** Everything under the headline, arriving after it has landed. */
export function AfterHeadline({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const reduced = useReducedMotion()

  return (
    <motion.div
      data-reveal
      className={className}
      initial={reduced ? false : { opacity: 0, y: 20, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.8, ease: EASE, delay: reduced ? 0 : delay }}
    >
      {children}
    </motion.div>
  )
}
