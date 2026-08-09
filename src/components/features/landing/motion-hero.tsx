'use client'

import { motion, useReducedMotion } from 'motion/react'
import * as React from 'react'

/**
 * The page's authored moment: the light arrives, then the words do.
 *
 * Motion here is on load, not on scroll. The previous version put every
 * entrance behind a scroll trigger, which meant the first viewport — the only
 * one most visitors see — was completely static.
 *
 * Timed for a phone, which is the harder case and the one that was wrong.
 *
 * The sequence used to run for 2.1 seconds end to end: the last word of the
 * headline landed at 0.9s, the buttons at 1.4s, the product frame at 2.0s.
 * That reads as considered on a desktop that opened the page a second ago and
 * as broken on a phone, where the thumb is already moving and the one control
 * the page exists to offer is still fading in underneath it. Nothing here is
 * removed — the order is the same and every piece still arrives — it is just
 * played at roughly half the length, finishing inside a second.
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
          /* 6px rather than 10px: this is the one blur that runs on several
             elements at once, and past about 6px on display type the word is
             unreadable for the first half of its own entrance anyway. */
          initial={{ opacity: 0, y: '0.5em', filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.04 * index }}
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
      initial={reduced ? false : { opacity: 0, y: 20, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.55, ease: EASE, delay: reduced ? 0 : delay }}
    >
      {children}
    </motion.div>
  )
}
