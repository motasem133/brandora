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

  /*
   * Drawn as an SVG arc rather than a CSS ring.
   *
   * A radial-gradient ring puts the line at the element's edge, where the
   * rounded box clips it and only the inner falloff survives — which is why
   * the earlier attempts read as haze. A stroked path gives the line and its
   * glow as separate, controllable things.
   */
  const arc = (
    <svg viewBox="0 0 1600 420" className="w-[110rem] max-w-none" preserveAspectRatio="xMidYMin slice">
      <defs>
        <linearGradient id="horizon-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7C3AED" stopOpacity="0" />
          <stop offset="18%" stopColor="#8B5CF6" stopOpacity="0.85" />
          <stop offset="42%" stopColor="#DDD6FE" />
          <stop offset="52%" stopColor="#FFFFFF" />
          <stop offset="64%" stopColor="#93C5FD" />
          <stop offset="86%" stopColor="#3B82F6" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
        </linearGradient>

        <filter id="horizon-glow" x="-30%" y="-120%" width="160%" height="360%">
          <feGaussianBlur stdDeviation="26" result="wide" />
          <feGaussianBlur stdDeviation="7" result="tight" />
          <feMerge>
            <feMergeNode in="wide" />
            <feMergeNode in="wide" />
            <feMergeNode in="tight" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/*
        One wide, shallow curve: the top of a circle far larger than the page.

        The stroke thickens and thins on a long cycle rather than only fading.
        Opacity alone dims the whole arc at once, which reads as a light being
        turned down; widening the line makes it read as a light with something
        burning behind it.
      */}
      {/*
        Two arcs of fixed width, cross-fading — rather than one whose width
        animates.

        The intent above is unchanged: the line still swells, so it still reads
        as a light with something burning behind it. But `strokeWidth` changes
        the geometry the glow filter is computed from, which made the browser
        re-run `feGaussianBlur` at stdDeviation 26 on every frame, forever. Two
        static geometries let the filter result be cached and leave opacity —
        which the compositor can do on its own — as the only thing moving.
      */}
      <path
        d="M -200 420 Q 800 -110 1800 420"
        fill="none"
        stroke="url(#horizon-line)"
        strokeWidth={2.5}
        filter="url(#horizon-glow)"
      />
      <motion.path
        d="M -200 420 Q 800 -110 1800 420"
        fill="none"
        stroke="url(#horizon-line)"
        strokeWidth={4.4}
        filter="url(#horizon-glow)"
        initial={{ opacity: 0 }}
        animate={reduced ? undefined : { opacity: [0, 1, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
    </svg>
  )

  if (reduced) {
    return (
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[34%] z-0 flex justify-center overflow-hidden">
        {arc}
      </div>
    )
  }

  return (
    <motion.div
      data-reveal
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-[34%] z-0 flex justify-center overflow-hidden"
      style={{ y, opacity: fade }}
    >
      <motion.div
        data-reveal
        className="relative flex justify-center"
        initial={{ y: 120, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1.8, ease: EASE, delay: 0.15 }}
      >
        {/* The bloom the crest throws up into the copy. */}
        {/*
          Opacity only. Animating `scale` on a 120px blur over a 736px box makes
          the browser re-rasterise the blur every frame; the breathing reads the
          same from a fade, and costs one composited property instead.
        */}
        <motion.div
          data-reveal
          className="absolute -top-[15rem] left-1/2 size-[46rem] -translate-x-1/2 rounded-full blur-[120px]"
          style={{
            background:
              'radial-gradient(circle, rgba(139,92,246,0.42), rgba(79,70,229,0.18) 45%, transparent 70%)',
          }}
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.div
          data-reveal
          animate={{ opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          {arc}
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

/**
 * A smaller arc for the sections below the fold.
 *
 * The same light, further away: thinner, dimmer, and rising from the section's
 * own base, so the page reads as one continuous sky rather than as a hero with
 * a horizon and then unrelated dark blocks.
 */
export function SectionArc({ className }: { className?: string }) {
  const reduced = useReducedMotion()

  const arc = (
    <svg viewBox="0 0 1600 300" className="w-[90rem] max-w-none" preserveAspectRatio="xMidYMin slice">
      <defs>
        <linearGradient id="section-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4F46E5" stopOpacity="0" />
          <stop offset="30%" stopColor="#8B5CF6" stopOpacity="0.5" />
          <stop offset="50%" stopColor="#C4B5FD" stopOpacity="0.9" />
          <stop offset="70%" stopColor="#60A5FA" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
        </linearGradient>
        <filter id="section-glow" x="-30%" y="-150%" width="160%" height="400%">
          <feGaussianBlur stdDeviation="18" result="w" />
          <feMerge>
            <feMergeNode in="w" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/*
        The same breath as the hero's crest, gated on visibility. There are four
        of these down the page, and an arc pulsing in a section nobody is
        looking at is a rAF loop that costs battery and shows nothing.
      */}
      <path
        d="M -200 300 Q 800 -40 1800 300"
        fill="none"
        stroke="url(#section-line)"
        strokeWidth={1.5}
        filter="url(#section-glow)"
      />
      <motion.path
        d="M -200 300 Q 800 -40 1800 300"
        fill="none"
        stroke="url(#section-line)"
        strokeWidth={2.9}
        filter="url(#section-glow)"
        initial={{ opacity: 0 }}
        whileInView={reduced ? undefined : { opacity: [0, 1, 0] }}
        viewport={{ once: false }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
    </svg>
  )

  const wrapper = `pointer-events-none absolute inset-x-0 z-0 flex justify-center overflow-hidden ${className ?? ''}`

  if (reduced) {
    return (
      <div aria-hidden className={wrapper}>
        {arc}
      </div>
    )
  }

  return (
    <motion.div
      data-reveal
      aria-hidden
      className={wrapper}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-15%' }}
      transition={{ duration: 1.4, ease: EASE }}
    >
      {arc}
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
      data-reveal
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
      data-reveal
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

/**
 * Grid children arriving in sequence, with a lift on hover.
 *
 * `lift` exists for cells that answer the pointer themselves. Two things
 * responding to one hover is not twice as responsive — and where the inner
 * response is momentum-based, a wrapper that moves out from under the cursor
 * makes the cell enter itself over and over.
 */
export function Cell({
  index,
  children,
  className,
  lift = true,
}: {
  index: number
  children: React.ReactNode
  className?: string
  lift?: boolean
}) {
  const reduced = useReducedMotion()

  return (
    <motion.div
      data-reveal
      initial={reduced ? false : { opacity: 0, y: 22, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-10%' }}
      transition={{ duration: 0.6, ease: EASE, delay: reduced ? 0 : Math.min(index * 0.05, 0.4) }}
      whileHover={reduced || !lift ? undefined : { y: -4, transition: { duration: 0.2, ease: EASE } }}
      className={`h-full ${className ?? ''}`}
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
      data-reveal
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
