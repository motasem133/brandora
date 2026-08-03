'use client'

import { motion, useReducedMotion } from 'motion/react'
import * as React from 'react'

/**
 * The manifest: a single generation run, itemised.
 *
 * The page's one authored moment lives here. Rows do not fade in together —
 * they arrive in the order the pipeline produces them, so scrolling the list
 * reads as the run completing rather than as a page decorating itself. Every
 * other section on the page is still.
 */

export function ManifestRow({
  label,
  note,
  index,
  children,
}: {
  label: string
  note?: string
  index: number
  children: React.ReactNode
}) {
  const reduced = useReducedMotion()

  return (
    <motion.li
      initial={reduced ? false : { opacity: 0, y: 18, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-12% 0px -12% 0px' }}
      transition={{
        duration: 0.55,
        // Exponential ease-out: fast arrival, long settle, no overshoot.
        ease: [0.16, 1, 0.3, 1],
        delay: reduced ? 0 : Math.min(index * 0.04, 0.2),
      }}
      className="grid gap-6 border-t border-line py-10 md:grid-cols-[15rem_1fr] md:gap-12 md:py-12"
    >
      <div className="md:pt-1">
        <h3 className="text-lg font-semibold tracking-tight">{label}</h3>
        {note && <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{note}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </motion.li>
  )
}

/**
 * The brief, pinned above the manifest.
 *
 * It stays on screen while the list scrolls past on wide viewports — the whole
 * argument is "this input produced all of that", and the input leaving the
 * screen is what breaks it.
 */
export function StickyBrief({ children }: { children: React.ReactNode }) {
  return <div className="lg:sticky lg:top-24">{children}</div>
}
