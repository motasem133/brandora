'use client'

import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import * as React from 'react'

/**
 * The page's authored moment: the light arrives, then the words do.
 *
 * Motion here is on load, not on scroll. The previous version put every
 * entrance behind a scroll trigger, which meant the first viewport — the only
 * one most visitors see — was completely static.
 */

const EASE = [0.16, 1, 0.3, 1] as const

/** Two slow light fields behind the hero. The only looping motion on the page. */
export function Aurora() {
  const reduced = useReducedMotion()

  if (reduced) {
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[720px] opacity-40"
        style={{
          background:
            'radial-gradient(60% 50% at 30% 0%, #7C3AED55, transparent 70%), radial-gradient(50% 45% at 75% 10%, #3B82F644, transparent 70%)',
        }}
      />
    )
  }

  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[820px] overflow-hidden">
      <motion.div
        className="absolute -left-[10%] -top-[22%] size-[46rem] rounded-full blur-[120px]"
        style={{ background: 'radial-gradient(circle, #7C3AED88, transparent 62%)' }}
        animate={{ x: [0, 90, 0], y: [0, 50, 0], scale: [1, 1.12, 1] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -right-[6%] -top-[10%] size-[38rem] rounded-full blur-[130px]"
        style={{ background: 'radial-gradient(circle, #3B82F677, transparent 62%)' }}
        animate={{ x: [0, -70, 0], y: [0, 70, 0], scale: [1, 1.18, 1] }}
        transition={{ duration: 32, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      />
      <motion.div
        className="absolute left-[38%] top-[6%] size-[30rem] rounded-full blur-[140px]"
        style={{ background: 'radial-gradient(circle, #4F46E566, transparent 60%)' }}
        animate={{ x: [0, 60, 0], y: [0, -40, 0] }}
        transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
      />
    </div>
  )
}

/**
 * The headline rises a word at a time, unblurring as it lands.
 *
 * Words rather than characters: character animation on a headline this size
 * reads as a typewriter gimmick, and it breaks Arabic, where letterforms join.
 */
export function HeadlineWords({ text, className }: { text: string; className?: string }) {
  const reduced = useReducedMotion()
  const words = text.split(' ')

  if (reduced) return <h1 className={className}>{text}</h1>

  return (
    <h1 className={className}>
      {words.map((word, index) => (
        <motion.span
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
    </h1>
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
      className={className}
      initial={reduced ? false : { opacity: 0, y: 20, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.8, ease: EASE, delay: reduced ? 0 : delay }}
    >
      {children}
    </motion.div>
  )
}

/**
 * The logo concepts, dealt out like cards and tilting to the pointer.
 *
 * This is the one place the visitor can touch the output, so it is the one
 * place that answers back.
 */
export function LogoTile({
  index,
  children,
}: {
  index: number
  children: React.ReactNode
}) {
  const reduced = useReducedMotion()

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 28, rotate: index % 2 ? 3 : -3, filter: 'blur(8px)' }}
      whileInView={{ opacity: 1, y: 0, rotate: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-15%' }}
      transition={{ duration: 0.7, ease: EASE, delay: reduced ? 0 : index * 0.09 }}
      whileHover={reduced ? undefined : { y: -8, scale: 1.03, transition: { duration: 0.25, ease: EASE } }}
    >
      {children}
    </motion.div>
  )
}

/** The website drifts slightly against the scroll, so the page has depth. */
export function ParallaxFrame({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [40, -40])

  return (
    <div ref={ref} className="overflow-hidden rounded-panel border border-line shadow-[var(--shadow-lifted)]">
      <motion.div style={reduced ? undefined : { y }}>{children}</motion.div>
    </div>
  )
}
