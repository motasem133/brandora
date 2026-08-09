import * as React from 'react'

/**
 * The page's authored moment: the light arrives, then the words do.
 *
 * Driven by CSS, not by a JavaScript animation library, and that is the whole
 * point rather than a style preference.
 *
 * Measured on a throttled phone, every dropped frame in the entrance fell
 * inside the first 700ms and every one of them sat under a long task — 101ms,
 * 155ms and 80ms of script evaluation and hydration. After 706ms the animation
 * held 16.7ms frames indefinitely. So the entrance was never janky; it was
 * being played by a main thread that was busy starting the page, during the
 * exact window it runs in. Nothing about the easing or the duration could fix
 * that, because the timeline itself could not get a turn.
 *
 * A CSS animation on opacity and transform is handed to the compositor and
 * keeps its own time, so it plays through hydration untouched. It also starts
 * at first paint (~208ms here) rather than whenever the bundle finishes, and it
 * needs no client component at all — these render on the server now, so the
 * work that was blocking the animation is itself a little smaller.
 *
 * `filter: blur()` is gone from the entrance with the same reasoning: it is the
 * one property here the compositor cannot animate on its own, so it re-rasters
 * every word every frame — the cost is real and, at 6px for half a second on a
 * phone, the effect was not.
 *
 * Reduced motion needs no branch: the global rule in `globals.css` collapses
 * every animation to a single frame.
 */

/**
 * A headline arriving a word at a time.
 *
 * Words rather than characters: character animation on a headline this size
 * reads as a typewriter gimmick, and it breaks Arabic, where letterforms join.
 *
 * It renders a `<span>`, not the heading itself: the heading is the caller's,
 * because the sentence it belongs to is longer than this clause — and while
 * this owned the `<h1>`, wrapping it in the real one nested a heading inside a
 * heading, which is invalid and cost a hydration error on every load.
 *
 * The stagger is `stagger-children`, which the product already uses everywhere
 * a list arrives in sequence: each child carries its index as `--i` and the
 * delay falls out of it, capped so a long headline never leaves its last word
 * waiting.
 */
export function HeadlineWords({ text, className }: { text: string; className?: string }) {
  const words = text.split(' ')

  return (
    <span className={`stagger-children ${className ?? ''}`}>
      {words.map((word, index) => (
        <React.Fragment key={`${word}-${index}`}>
          <span className="inline-block" style={{ '--i': index } as React.CSSProperties}>
            {word}
          </span>
          {/*
            The space is a sibling of the word, not the last thing inside it.
            A trailing space at the end of an inline-block is collapsed away,
            which welds the headline into "Yourentirebrand" while still leaving
            a line-break opportunity — so it wraps in the right places and reads
            as one long word. Outside the box it is an ordinary text node in the
            heading's own inline run, and survives.
          */}
          {index < words.length - 1 && ' '}
        </React.Fragment>
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
  return (
    <div
      className={`animate-fade-up ${className ?? ''}`}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  )
}
