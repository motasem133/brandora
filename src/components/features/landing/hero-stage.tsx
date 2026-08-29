import Image from 'next/image'

import { LOGOS, PALETTE, POSTS } from '@/components/features/landing/sultana'

/**
 * The hero's subject: one real brand, at native size, arriving.
 *
 * Three attempts got here and the two that failed are worth keeping, because
 * each was wrong for a different reason. A pale wall of eighteen thumbnails read
 * as texture rather than as a hero — a pattern has no subject. A dark stage
 * under a light page read as bold and was also the dark theme walking back in
 * through the fold, three turns after it was removed on purpose.
 *
 * Bold without dark: ink on ground at **16.1:1**, higher than the white-on-black
 * heroes this was measured against, type to 100px, and the artefacts large and
 * lifted. Nothing is scaled past what it was rendered at, because every asset
 * here is a 1080px square and this is the page selling their sharpness.
 *
 * **The motion is the kit arriving, and it is the only motion in the fold.**
 * The page's authored moment is the guest handover further down — the section
 * that hands itself to a generated brand — and a hero with its own set-piece
 * would be competing with it. So this is an arrival, not a performance: the
 * post settles, the mark follows a beat later, the palette fills in last. It
 * echoes what the product does without narrating it.
 *
 * **It is CSS, and that is a fix rather than a preference.** The arrival was a
 * `motion/react` client component and it lagged twice over: it animated
 * `filter: blur()` on a 480px image, which re-rasterises the layer every frame,
 * and being a client boundary it held the fold at `opacity: 0` until the motion
 * bundle hydrated — the hero's first paint waited on JavaScript to show the one
 * thing the page is selling. `animate-rise` already carried distance, duration
 * and delay as custom properties, so the whole arrival is three utilities on a
 * server component now: it starts at first paint, and opacity and transform are
 * the two things a compositor animates without repainting. Reduced motion is
 * handled once, globally, in `globals.css`.
 *
 * The headline deliberately does not animate. It is the first thing on the page
 * and the thing a visitor is there to read; fading it in buys atmosphere at the
 * cost of the one element that should be instant.
 */
export function HeroArtefacts() {
  return (
    <div className="relative hidden w-[26rem] shrink-0 lg:block xl:w-[30rem]">
      <div
        className="animate-rise overflow-hidden rounded-panel shadow-[var(--shadow-lifted)] ring-1 ring-line"
        style={{ '--rise-y': '24px', '--rise-duration': '0.7s', '--rise-delay': '0.05s' } as React.CSSProperties}
      >
        <Image
          src={POSTS[2]}
          alt=""
          width={1080}
          height={1080}
          sizes="30rem"
          priority
          className="h-auto w-full"
        />
      </div>

      {/*
        Beneath the post, not across it.

        Two passes overlapped the lower corner and both covered the post's own
        caption — "A table where time slows, recipes are passed down like
        heirlooms" — cutting a generated line mid-sentence. On a page arguing
        "look at the actual work", occluding the work for a prettier arrangement
        is the one composition that cannot be right. Offset to the start edge
        instead: still an arrangement, hiding nothing.
      */}
      <div
        className="animate-rise relative -ms-14 mt-5 w-[16rem] rounded-card bg-surface p-5 shadow-[var(--shadow-lifted)] ring-1 ring-line"
        style={{ '--rise-y': '24px', '--rise-duration': '0.7s', '--rise-delay': '0.22s' } as React.CSSProperties}
      >
        <Image
          src={LOGOS[0].src}
          alt=""
          width={LOGOS[0].width}
          height={LOGOS[0].height}
          sizes="16rem"
          priority
          className="h-auto w-full"
        />

        {/* The palette fills in last and left to right, which is the order the
            run writes it in. The fill is a stagger rather than a per-swatch
            scaleX, because `animate-rise` was already here and a second
            keyframe to widen five 40px bars is not worth its own line in the
            stylesheet. */}
        <div className="mt-4 flex gap-1.5">
          {PALETTE.map((hex, index) => (
            <span
              key={hex}
              style={
                {
                  backgroundColor: hex,
                  '--rise-y': '0px',
                  '--rise-duration': '0.45s',
                  '--rise-delay': `${0.42 + index * 0.06}s`,
                } as React.CSSProperties
              }
              className="animate-rise h-2.5 flex-1 rounded-full"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
