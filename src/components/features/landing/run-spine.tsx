'use client'

import { motion, useScroll, useSpring } from 'motion/react'
import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Where you are on a long page, and how much of it is left.
 *
 * Two parts, because they answer at two widths. Everywhere: a hairline of
 * progress under the header, which is the cheapest honest answer to "how much
 * more is there". From `lg`, where there is dead margin either side of a 72rem
 * column anyway: the section list, marked with the one you are in and clickable
 * to the rest.
 *
 * It is navigation, not ornament. The No Dead Column Rule says a persistent side
 * region has to earn its width down the whole page — this one does, because it
 * changes on every section and every item goes somewhere. The header keeps its
 * own nav for the visitor who never scrolls; this is for the one who has.
 *
 * Deliberately not a row of run stages. The five stages of a generation are a
 * real sequence, but they are not the sequence *this page* is in, and a rail
 * that says "Choose" while you are reading the pricing table is the decorative
 * numbering this redesign exists to avoid.
 */

export type SpineItem = { id: string; label: string }

export function RunSpine({ items, label }: { items: SpineItem[]; label: string }) {
  const [active, setActive] = React.useState<string | null>(null)
  const [past, setPast] = React.useState(false)

  const { scrollYProgress } = useScroll()
  /* The bar tracks the wheel through a spring for the same reason the horizon's
     parallax does: one-to-one tracking is what makes a page feel jittery. */
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 })

  /*
   * Which section is being read, from the sections themselves.
   *
   * The observation box is squeezed to a band across the middle of the viewport
   * — top and bottom inset to 45% — so "active" means "crossing the middle of
   * the screen" rather than "has one pixel on screen", which with sections this
   * tall would mark two of them at once for most of the scroll.
   */
  React.useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((node): node is HTMLElement => node !== null)

    if (sections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id)
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [items])

  /* The rail appears once the hero is behind you — it has nothing to say while
     the first screen is the only thing that has been seen. */
  React.useEffect(() => {
    const onScroll = () => setPast(window.scrollY > window.innerHeight * 0.6)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      {/* The hairline. `scaleX` from the inline start, so it fills the way the
          page is read in both directions. */}
      <motion.div
        aria-hidden
        className="fixed inset-x-0 top-0 z-50 h-px origin-[left] bg-[var(--accent-surface)] rtl:origin-[right]"
        style={{ scaleX: progress }}
      />

      {/*
        Marks, not labels.

        The first build of this put the section names in the margin, and it was
        wrong twice over: at 1440 a 72rem column leaves 80px either side, so the
        words sat on top of the content; and being fixed, the rail is outside
        both world scopes, so its "current" white landed on Sultana's cream
        section as white-on-cream and disappeared.

        A column of dashes is 2rem wide and collides with nothing at any width.
        The name is still in the DOM for a screen reader, and it slides out on
        hover or keyboard focus — on its own frosted ground, so it is readable
        over whichever world it happens to be floating above.
      */}
      <nav
        aria-label={label}
        className={cn(
          'fixed start-4 top-1/2 z-30 hidden -translate-y-1/2 lg:block',
          'transition-[opacity,visibility] duration-500',
          /*
           * `invisible`, not just transparent.
           *
           * At the top of the page this rail is faded out but its four links
           * were still in the tab order, so a keyboard user met "What you get,
           * How it works, Pricing" in the header and then immediately met them
           * again on something they could not see, before reaching the hero's
           * call to action. `visibility: hidden` takes them out of the tab order
           * and still animates, which a `display` toggle would not.
           */
          past ? 'visible opacity-100' : 'invisible pointer-events-none opacity-0',
        )}
      >
        <ul className="space-y-3">
          {items.map((item) => {
            const current = active === item.id

            return (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  aria-current={current ? 'page' : undefined}
                  /* No `outline-none`: the label sliding out is a nice extra
                     signal and a poor substitute for the focus ring, and the
                     global `:focus-visible` rule is what a keyboard user is
                     actually looking for. */
                  /* 32×44. The dash is 2px tall and the label only appears on
                     hover, so the anchor carries the target size itself —
                     otherwise this is a 32×16 control, under WCAG 2.2's 24px
                     floor even on a pointer device. */
                  className="group relative flex h-11 w-8 items-center rounded-full outline-offset-4"
                >
                  {/*
                    Quiet Grey rather than a hairline mixed from white: this
                    element floats over a near-black section and a cream one, and
                    a translucent white dash is invisible on the second. A solid
                    mid grey is legible on both, and the state is carried by
                    length and colour together rather than by colour alone.
                  */}
                  <span
                    aria-hidden
                    className={cn(
                      'h-0.5 rounded-full transition-all duration-300',
                      current
                        ? 'w-8 bg-[var(--accent-surface)]'
                        : 'w-4 bg-fg-muted group-hover:w-6 group-focus-visible:w-6',
                    )}
                  />

                  <span
                    className={cn(
                      'glass pointer-events-none absolute start-10 whitespace-nowrap rounded-full border border-line px-3 py-1.5',
                      'type-eyebrow text-fg opacity-0 transition-opacity duration-200',
                      'group-hover:opacity-100 group-focus-visible:opacity-100',
                    )}
                  >
                    {item.label}
                  </span>
                </a>
              </li>
            )
          })}
        </ul>
      </nav>

      {/*
        The same four destinations, adapted rather than scaled.

        Below `lg` the margin the dash rail lives in does not exist, and the
        header drops its own nav at `md` — so a phone had no way through 11,000
        pixels of page except the scrollbar. The dashes could not simply be
        shown at a narrower width either: their labels appear on hover, and
        there is no hover on a touch screen.

        So it becomes a bar along the bottom, which is where a thumb already is,
        with the labels always visible because that is the only way they can be
        read here. It scrolls horizontally rather than wrapping, so four items
        stay on one line at 320px, and it arrives only once the hero is behind
        you — navigation is worth nothing on the first screen, and 56px of
        permanent furniture there would cost the fold the panel just won back.

        This is the pattern DESIGN.md already gives the app for the same
        problem: below `lg` the rail becomes a horizontally scrolling row.
      */}
      <nav
        aria-label={label}
        className={cn(
          'glass fixed inset-x-0 bottom-0 z-40 border-t border-line lg:hidden',
          'transition-[transform,visibility] duration-300',
          past ? 'visible translate-y-0' : 'invisible translate-y-full',
        )}
        /* Clears the home indicator on a notched phone without adding a gap on
           one that has none. */
        style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}
      >
        <ul className="flex gap-1 overflow-x-auto px-3 py-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((item) => {
            const current = active === item.id

            return (
              <li key={item.id} className="shrink-0">
                <a
                  href={`#${item.id}`}
                  aria-current={current ? 'page' : undefined}
                  /* 44px of height, which is the floor for something a thumb
                     has to hit while the page is moving. */
                  className={cn(
                    'flex min-h-11 items-center rounded-full px-4 text-sm transition-colors',
                    current
                      ? 'control-lit bg-elevated text-fg'
                      : 'text-fg-secondary hover:text-fg',
                  )}
                >
                  {item.label}
                </a>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
