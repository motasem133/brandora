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
    /*
     * The width is what makes this a horizon rather than a seam.
     *
     * 110rem is 1760px. Over a 1440px desktop that is a 1.2x window onto the
     * arc and you see the crest. Over a 390px phone it is a 4.5x window onto
     * the middle of it, where the curve's apex has long left the top of the
     * box — so the fill below the curve becomes a full-width rectangle of lit
     * violet with a hard horizontal edge, and the rim reads as a straight
     * bright line ruled across the paragraph it was meant to sit under. That
     * is the "hard seam through the copy" this fixes: a phone gets a narrower
     * arc, so the crest is inside the window at that width too.
     */
    <svg viewBox="0 0 1600 420" className="w-[48rem] max-w-none sm:w-[110rem]" preserveAspectRatio="xMidYMin slice">
      <defs>
        {/*
          The rim, across the arc.

          Named colours come from the tokens, so re-anchoring the ramp moves
          this with it — which is the whole point and exactly what did not
          happen last time: the anchor moved to #7240ff and this arc went on
          being drawn in the violet it replaced. The pale stops in between stay
          literal because they are samples along a ramp rather than members of
          the palette, which is what the Rendered Light Rule says they are.
        */}
        <linearGradient id="horizon-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="0" />
          <stop offset="18%" stopColor="#8f66ff" stopOpacity="0.85" />
          <stop offset="42%" stopColor="#ded1ff" />
          <stop offset="52%" stopColor="#ffffff" />
          <stop offset="64%" stopColor="#93c5fd" />
          <stop offset="86%" stopColor="var(--brand-secondary)" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
        </linearGradient>

        {/*
          The body of the ring, under the rim.

          Measured off the reference: below its rim there are eighty-odd pixels
          of lit colour before the disc goes dark, and that band is most of what
          makes the thing read as an object with light behind it. This page drew
          the rim and the haze and nothing in between, so the arc read as a
          drawn line rather than as a horizon.
        */}
        <linearGradient id="horizon-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ded1ff" stopOpacity="0.5" />
          <stop offset="14%" stopColor="var(--brand-primary)" stopOpacity="0.3" />
          <stop offset="52%" stopColor="var(--brand-secondary)" stopOpacity="0.1" />
          <stop offset="100%" stopColor="var(--brand-secondary)" stopOpacity="0" />
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

      {/* The lit band, closed along the section's base so it fills under the
          curve. Drawn first, so the rim sits on top of it. */}
      <path d="M -200 420 Q 800 -110 1800 420 Z" fill="url(#horizon-body)" />

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

  /*
   * Where the light sits, and what stops clipping it.
   *
   * 34% of the hero is behind the product frame on a desktop and squarely
   * across the deck on a phone, because the same copy is four times as tall
   * there — so the crest was ruled through the sentence that explains what the
   * product does. It starts lower at that width, under the buttons, which is
   * where the frame it is meant to be behind begins.
   *
   * `overflow-hidden` came off with it. It was cutting the bloom in half, and a
   * blurred radial with a straight edge across the top of it is the one thing
   * on the page that read as a rendering seam rather than as light. Nothing was
   * relying on it: the hero section clips its own overflow, which is what keeps
   * the wide arc from widening the document — checked at 390 and at 1440.
   */
  const frame = 'pointer-events-none absolute inset-x-0 top-[52%] z-0 flex justify-center sm:top-[34%]'

  if (reduced) {
    return (
      <div aria-hidden className={frame}>
        {arc}
      </div>
    )
  }

  return (
    <motion.div
      data-reveal
      aria-hidden
      className={frame}
      style={{ y, opacity: fade }}
    >
      {/* The arrival is CSS for the same reason the hero's words are: it plays
          at 0.1s, inside the window the main thread spends hydrating. */}
      <div
        className="animate-rise relative flex justify-center"
        style={
          {
            '--rise-y': '120px',
            '--rise-duration': '1.1s',
            '--rise-delay': '0.1s',
          } as React.CSSProperties
        }
      >
        {/* The bloom the crest throws up into the copy. */}
        {/*
          Opacity only. Animating `scale` on a 120px blur over a 736px box makes
          the browser re-rasterise the blur every frame; the breathing reads the
          same from a fade, and costs one composited property instead.
        */}
        <motion.div
          data-reveal
          /* The blur radius is the whole cost of this layer, and it scales with
             the area being re-rasterised. A phone gets a 736px circle blurred
             at 60px instead of 120px, which at that width is visually the same
             wash and a quarter of the work. */
          className="absolute -top-[15rem] left-1/2 size-[46rem] -translate-x-1/2 rounded-full blur-[60px] sm:blur-[120px]"
          style={{
            background:
              'radial-gradient(circle, rgba(143,102,255,0.42), rgba(91,92,251,0.18) 45%, transparent 70%)',
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
      </div>
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
    /* Narrower on a phone for the same reason as the hero's — see there. */
    <svg viewBox="0 0 1600 300" className="w-[44rem] max-w-none sm:w-[90rem]" preserveAspectRatio="xMidYMin slice">
      <defs>
        <linearGradient id="section-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--brand-indigo)" stopOpacity="0" />
          <stop offset="30%" stopColor="#8f66ff" stopOpacity="0.5" />
          <stop offset="50%" stopColor="#cbb8ff" stopOpacity="0.9" />
          <stop offset="70%" stopColor="#60a5fa" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--brand-secondary)" stopOpacity="0" />
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
      viewport={{ once: true, margin: '-15% 0px' }}
      transition={{ duration: 1.4, ease: EASE }}
    >
      {arc}
    </motion.div>
  )
}

/**
 * The product frame: rises into place, then drifts against the scroll.
 *
 * The two motions are deliberately on two elements and driven by two different
 * things. The rise is a one-shot that plays during hydration, so it is CSS and
 * runs on the compositor — see `animate-rise` in `globals.css` for the frame
 * measurements behind that. The drift answers the scroll, which only JavaScript
 * can read, so it stays here.
 *
 * No blur on either. This is the largest layer on the page — a full-bleed
 * screenshot inside a perspective container — and animating a blur across it
 * re-rasterises the whole thing every frame, on the phone that has just
 * finished decoding the image.
 */
export function ProductFrame({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [0, -90])

  return (
    <div
      ref={ref}
      className="animate-rise [perspective:1200px]"
      style={
        {
          '--rise-y': '90px',
          '--rise-tilt': '9deg',
          '--rise-delay': '0.4s',
        } as React.CSSProperties
      }
    >
      <motion.div style={reduced ? undefined : { y }}>{children}</motion.div>
    </div>
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
      initial={reduced ? false : { opacity: 0, y: 26, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      /* Fires earlier and finishes sooner. A reveal tuned to a desktop viewport
         is a reveal that happens after the phone has already scrolled past it. */
      viewport={{ once: true, margin: '-8% 0px' }}
      transition={{ duration: 0.55, ease: EASE, delay }}
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
      initial={reduced ? false : { opacity: 0, y: 22, filter: 'blur(4px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-6% 0px' }}
      /* The cap matters more than the step: a two-column grid on a phone puts
         the last cell at index 6, and 0.4s of waiting to see it was most of why
         the page felt like it was catching up with the scroll. */
      transition={{ duration: 0.45, ease: EASE, delay: reduced ? 0 : Math.min(index * 0.035, 0.2) }}
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
          'linear-gradient(90deg, transparent, rgba(170,140,255,0.09) 45%, rgba(147,197,253,0.06) 60%, transparent)',
      }}
      initial={{ x: '-60vw' }}
      animate={{ x: '120vw' }}
      transition={{ duration: 9, repeat: Infinity, repeatDelay: 5, ease: 'easeInOut' }}
    />
  )
}
