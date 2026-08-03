'use client'

import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'
import * as React from 'react'

const EASE = [0.16, 1, 0.3, 1] as const

/**
 * The horizon: a light rising behind the page.
 *
 * It arrives on load — the crest climbs and the bloom builds — then settles
 * into a very slow breath. On scroll it sinks faster than the content above
 * it, which is what makes the page feel like it has a sky rather than a
 * background colour.
 */
export function Horizon() {
  const reduced = useReducedMotion()
  const { scrollY } = useScroll()

  // Springs keep the parallax from tracking the wheel one-to-one, which is
  // what separates a considered page from a jittery one.
  const raw = useTransform(scrollY, [0, 900], [0, 220])
  const y = useSpring(raw, { stiffness: 90, damping: 24, mass: 0.6 })
  const fade = useTransform(scrollY, [0, 700], [1, 0.35])

  const ring =
    'radial-gradient(circle at 50% 50%, transparent 0 44%, rgba(124,58,237,0.22) 44.6%, rgba(139,92,246,0.6) 46.2%, rgba(196,181,253,0.95) 47.6%, #ffffff 48.5%, rgba(147,197,253,0.95) 49.4%, rgba(59,130,246,0.55) 50.8%, rgba(37,99,235,0.18) 52.4%, transparent 54%)'

  if (reduced) {
    return (
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[52%] z-0 flex justify-center">
        <div
          className="size-[64rem] shrink-0 rounded-full sm:size-[82rem]"
          style={{ background: ring, filter: 'drop-shadow(0 -10px 60px rgba(139,92,246,0.7))' }}
        />
      </div>
    )
  }

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-[52%] z-0 flex justify-center"
      style={{ y, opacity: fade }}
    >
      <motion.div
        className="relative flex justify-center"
        initial={{ y: 130, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1.8, ease: EASE, delay: 0.15 }}
      >
        {/* The bloom the crest throws upward into the copy. */}
        <motion.div
          className="absolute -top-[13rem] size-[44rem] rounded-full blur-[110px]"
          style={{
            background:
              'radial-gradient(circle, rgba(139,92,246,0.34), rgba(79,70,229,0.16) 45%, transparent 70%)',
          }}
          animate={{ opacity: [0.75, 1, 0.75], scale: [1, 1.06, 1] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.div
          className="size-[64rem] shrink-0 rounded-full sm:size-[82rem]"
          style={{ background: ring }}
          animate={{
            filter: [
              'drop-shadow(0 -4px 22px rgba(196,181,253,0.85)) drop-shadow(0 -18px 80px rgba(99,102,241,0.5))',
              'drop-shadow(0 -4px 34px rgba(221,214,254,1)) drop-shadow(0 -22px 100px rgba(129,140,248,0.65))',
              'drop-shadow(0 -4px 22px rgba(196,181,253,0.85)) drop-shadow(0 -18px 80px rgba(99,102,241,0.5))',
            ],
          }}
          transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>
    </motion.div>
  )
}

/** The product frame: rises into place, then drifts against the scroll. */
export function ProductFrame({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [0, -90])

  return (
    <motion.div
      ref={ref}
      style={reduced ? undefined : { y }}
      initial={reduced ? false : { opacity: 0, y: 90, rotateX: 9, filter: 'blur(12px)' }}
      animate={{ opacity: 1, y: 0, rotateX: 0, filter: 'blur(0px)' }}
      transition={{ duration: 1.2, ease: EASE, delay: 0.75 }}
      className="[perspective:1200px]"
    >
      {children}
    </motion.div>
  )
}

/** A section that assembles as it enters, once. */
export function SectionReveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const reduced = useReducedMotion()

  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 26, filter: 'blur(8px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-12%' }}
      transition={{ duration: 0.75, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  )
}

/** Grid children arriving in sequence, with a lift on hover. */
export function Cell({ index, children }: { index: number; children: React.ReactNode }) {
  const reduced = useReducedMotion()

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 22, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-10%' }}
      transition={{ duration: 0.6, ease: EASE, delay: reduced ? 0 : Math.min(index * 0.05, 0.4) }}
      whileHover={reduced ? undefined : { y: -4, transition: { duration: 0.2, ease: EASE } }}
      className="h-full"
    >
      {children}
    </motion.div>
  )
}

/**
 * A slow band of light crossing the section, once per cycle.
 *
 * Cheap to run — one transform on a masked gradient — and it is what keeps a
 * dark page from looking like a still image between reveals.
 */
export function LightSweep() {
  const reduced = useReducedMotion()
  if (reduced) return null

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 w-[42rem] skew-x-[-18deg]"
      style={{
        background:
          'linear-gradient(90deg, transparent, rgba(167,139,250,0.09) 45%, rgba(147,197,253,0.06) 60%, transparent)',
      }}
      initial={{ x: '-60vw' }}
      animate={{ x: '120vw' }}
      transition={{ duration: 9, repeat: Infinity, repeatDelay: 5, ease: 'easeInOut' }}
    />
  )
}
