'use client'

import { Check, RefreshCw } from 'lucide-react'
import Image from 'next/image'
import * as React from 'react'

import { LOGOS, SITE_ADDRESS } from '@/components/features/landing/sultana'
import { cn } from '@/lib/utils'

/**
 * The artifact beside whichever step is being read.
 *
 * This column used to hold one screenshot of the brief, captioned "The first of
 * eight questions", and it held it for all five steps — so four fifths of the
 * time the picture argued with the words next to it, and below the third step it
 * was three hundred pixels of empty column. A persistent side region has to earn
 * its width down the whole page; that is the No Dead Column Rule, and one static
 * image beside a five-item list does not.
 *
 * The observation pattern is `RunSpine`'s, for the same reason: a band across
 * the middle of the viewport rather than "has a pixel on screen", because these
 * steps are tall enough that two would otherwise be current at once.
 *
 * **Every artifact here is real or is visibly a diagram.** One screenshot
 * exists in this repo and it belongs to the brief, so it is the only screenshot
 * used. The rest are drawn from the same Sultana run the whole page is built out
 * of, or — for the two steps whose subject is a mechanism rather than an object
 * — are blocked-out diagrams in the manner the contact sheet's website tile
 * already establishes. Nothing here is a mockup of a screen that was never
 * captured, which on the page selling generated output is the one lie that would
 * cost the most.
 */
export function HowPanel({
  stepIds,
  captions,
  shotAlt,
  logoNames,
  sections,
  pages,
  refineNote,
}: {
  /** The `<li>` ids to watch, in the order they are read. */
  stepIds: string[]
  /** One caption per step, parallel to `stepIds`. */
  captions: string[]
  shotAlt: string
  /** The four lockup names; only the first two are shown here. */
  logoNames: string[]
  /** The run's five sections, for the two diagrams that name them. */
  sections: { key: string; label: string }[]
  /** The page set a published site takes. */
  pages: string[]
  /** What "every earlier version is kept" means, in one line. */
  refineNote: string
}) {
  const [active, setActive] = React.useState(0)

  React.useEffect(() => {
    const nodes = stepIds
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => node !== null)

    if (nodes.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const index = nodes.indexOf(entry.target as HTMLElement)
          if (index >= 0) setActive(index)
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    )

    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [stepIds])

  const artifacts = [
    /* ------------------------------------------------------------- brief */
    /* The one real screenshot on this page's process section. */
    <Image
      key="brief"
      src="/marketing/run-brief.webp"
      alt={shotAlt}
      /* The capture's own pixel dimensions. `w-full` with no height class takes
         its aspect from these, so a stale pair here stretches the screenshot
         rather than failing loudly. */
      width={1440}
      height={624}
      className="w-full rounded-card"
      sizes="(max-width: 1024px) 100vw, 640px"
      priority={false}
    />,

    /* ---------------------------------------------------------- generate */
    /* The five sections the run actually queues, named from the same catalogue
       entry the hero's replay reads. Every one ticked, because this step is the
       run having finished rather than the run in flight — the panel in the fold
       is where it is watched happening. */
    <ul key="generate" className="space-y-2.5 p-2">
      {sections.map((section) => (
        <li
          key={section.key}
          className="flex items-center gap-3 rounded-control border border-line px-4 py-3"
        >
          <Check className="size-4 shrink-0 text-[var(--accent-surface)]" />
          <span className="text-sm text-fg-secondary">{section.label}</span>
        </li>
      ))}
    </ul>,

    /* ------------------------------------------------------------ choose */
    /* The two concepts, and only the two. The contact sheet further up shows
       all four lockups because its subject is what you are handed; this step's
       subject is the decision, and the decision is between two marks. */
    <div key="choose" className="grid grid-cols-2 gap-4 p-2">
      {LOGOS.slice(0, 2).map((logo, index) => (
        <figure key={logo.src} className="flex flex-col">
          <div className="flex min-h-36 flex-1 items-center justify-center rounded-control border border-line bg-white/95 p-5">
            <Image
              src={logo.src}
              alt={logoNames[index]}
              width={logo.width}
              height={logo.height}
              className="max-h-24 w-full object-contain"
              sizes="(max-width: 1024px) 45vw, 280px"
            />
          </div>
          <figcaption className="mt-2 text-center text-xs text-fg-muted">
            {logoNames[index]}
          </figcaption>
        </figure>
      ))}
    </div>,

    /* ------------------------------------------------------------ refine */
    /* A diagram, and visibly one. Re-running a section is a mechanism, not an
       object, so there is nothing to photograph — what a visitor needs is that
       it is *one* section rather than the whole run, and that the previous
       version does not disappear when it is replaced. */
    <div key="refine" className="p-4">
      <ul className="flex flex-wrap gap-2">
        {sections.map((section) => {
          const rerunning = section.key === 'logos'
          return (
            <li
              key={section.key}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs',
                rerunning
                  ? 'border-[var(--accent-surface)] text-fg'
                  : 'border-line text-fg-muted',
              )}
            >
              {rerunning && <RefreshCw aria-hidden className="size-3" />}
              {section.label}
            </li>
          )
        })}
      </ul>

      {/* The versions, as a stack. Unlabelled on purpose: numbering them would
          be inventing a history for a brand whose real one is not in this repo,
          and the point is only that the earlier ones are still there. */}
      <div aria-hidden className="relative mt-6 h-24">
        <div className="absolute inset-x-6 top-6 h-16 rounded-control border border-line bg-elevated/40" />
        <div className="absolute inset-x-3 top-3 h-16 rounded-control border border-line bg-elevated/70" />
        <div className="absolute inset-x-0 top-0 h-16 rounded-control border border-[var(--accent-surface)] bg-elevated" />
      </div>

      <p className="mt-4 text-xs leading-relaxed text-fg-muted">{refineNote}</p>
    </div>,

    /* ----------------------------------------------------------- publish */
    /* The same honest browser chrome the contact sheet's website tile uses, and
       for the same stated reason: no capture of a generated site exists, so the
       address form and the page set are what this can truthfully show. Not a
       link — customer subdomains do not resolve yet. */
    <div key="publish" className="overflow-hidden rounded-card border border-line">
      <div className="flex items-center gap-2 border-b border-line bg-elevated px-3 py-2">
        <span aria-hidden className="flex gap-1">
          {[0, 1, 2].map((dot) => (
            <span key={dot} className="size-2 rounded-full bg-line-strong" />
          ))}
        </span>
        <span className="machine-value truncate font-mono text-xs text-fg-muted">
          {SITE_ADDRESS}
        </span>
      </div>

      <div className="p-5">
        <ul className="flex flex-wrap gap-2">
          {pages.map((page) => (
            <li
              key={page}
              className="rounded-full border border-line px-3 py-1 text-xs text-fg-secondary"
            >
              {page}
            </li>
          ))}
        </ul>

        <div aria-hidden className="mt-5 space-y-2.5">
          <div className="h-14 rounded-control bg-[var(--accent-surface)] opacity-90" />
          <div className="flex gap-2.5">
            <div className="h-8 flex-1 rounded-control bg-elevated" />
            <div className="h-8 flex-1 rounded-control bg-elevated" />
            <div className="h-8 flex-1 rounded-control bg-elevated" />
          </div>
          <div className="h-3 w-2/3 rounded-full bg-elevated" />
        </div>
      </div>
    </div>,
  ]

  return (
    <div className="lg:sticky lg:top-28">
      <div className="lit [--lit-radius:var(--radius-panel)]">
        <div className="lit-inner bloom p-4 [--bloom-strength:16%] sm:p-6">
          {/*
            Crossfaded in place rather than swapped, and the box holds its
            height across the change: the artifacts are different shapes, and a
            column that resizes under a reader who is scrolling past it moves
            the text they are reading. `min-h` is measured off the tallest of
            the five at this width.
          */}
          <div className="relative grid min-h-[18rem] items-center">
            {artifacts.map((artifact, index) => (
              <div
                key={index}
                /* Stacked in one grid cell, so the tallest one sets the height
                   and none of them is positioned out of flow. */
                className={cn(
                  'col-start-1 row-start-1 transition-opacity duration-500',
                  index === active ? 'opacity-100' : 'pointer-events-none opacity-0',
                )}
                /* Hidden from assistive technology unless it is the one being
                   described. Five artifacts in the accessibility tree at once,
                   four of them invisible, is four descriptions of things that
                   are not on screen. */
                aria-hidden={index !== active}
                /* A real boolean: React 19 reflects `inert={false}` by removing
                   the attribute, and an empty string is the pre-19 spelling it
                   now warns about. */
                inert={index !== active}
              >
                {artifact}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/*
        The caption is the part that was wrong: it named the brief while you
        read about publishing. It is a live region because on a keyboard or a
        screen reader the artifact changes without any action, and an unannounced
        change is a change that did not happen.
      */}
      <p
        aria-live="polite"
        className="mt-4 min-h-[3.5rem] max-w-[46ch] text-sm leading-relaxed text-fg-muted"
      >
        {captions[active]}
      </p>
    </div>
  )
}
