'use client'

import { Check } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import Image from 'next/image'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FONTS, LOGOS, PALETTE, POSTS } from './sultana'

/**
 * The page's signature: one real run, replayed.
 *
 * This replaces a screenshot of the dashboard. A product that generates an
 * entire brand in about a minute has exactly one visually demonstrable moment,
 * and it is not a picture of the software — it is many artifacts arriving
 * together and turning out to agree with each other. So the hero shows that
 * happening, using only files Sultana's run actually produced.
 *
 * Three things it has to stay honest about, because a fabricated demo on a page
 * selling generated output is the one lie that would matter:
 *
 * 1. Every asset is a real file from `public/marketing`.
 * 2. The step names are the pipeline's own — `branding`, `logos`, `website`,
 *    `social`, `kit` are what `server/inngest/generate.ts` marks. They are not
 *    invented stage names chosen to read well.
 * 3. It is labelled a replay, and the real duration is stated beside it. The
 *    clock is scaled, which is what "replay" means; the caption says so rather
 *    than leaving a nine-second run implied.
 *
 * The accent flip at the end of `branding` is the whole product in one gesture:
 * Brandora's violet withdraws and Sultana's own colour takes the panel. That is
 * the Guest Palette Rule performed rather than described.
 */

/* -------------------------------------------------------------- timeline --- */

/*
 * One clock, and everything derived from it.
 *
 * The alternative — a chain of `setTimeout`s advancing a stage integer — drifts,
 * cannot be rewound for the replay control, and needs a matching teardown per
 * timer. A single interval with derived state has one thing to clear.
 *
 * 120ms rather than a frame: the only continuously moving parts are the bars,
 * and those are CSS transitions between ticks, so the compositor draws the
 * in-between frames. Ticking at 60fps would re-render this subtree 550 times to
 * show the same thing.
 */
const TICK = 120

const BRIEF_AT = [200, 600, 1000]
const STEPS_AT = 1600
const STEP_MS = 1150

/**
 * The timeline, derived from however many steps the catalogue actually has.
 *
 * These were constants with a literal `* 5` in them, against a `steps` array
 * that arrives as a prop from `messages/*.json`. Adding or removing a step —
 * an ordinary copy edit, in a file whose whole job is to be edited — would
 * have left the convergence firing while a step was still running, or the
 * panel sitting on a finished list for a second and a half before it resolved.
 * Nothing would have thrown; it would just have been subtly wrong, in the one
 * component on the page that has to look deliberate.
 */
function timelineFor(stepCount: number) {
  /* One step minimum, so a catalogue that somehow arrives empty still plays a
     coherent brief-then-resolve rather than converging before it starts. */
  const converge = STEPS_AT + STEP_MS * Math.max(1, stepCount)
  const done = converge + 1250
  return { converge, done, end: done + 600 }
}

/** The run this replays took about a minute; the clock is scaled to it. */
const REAL_SECONDS = 58

type Phase = { t: number; running: boolean }

/** `useLayoutEffect` warns when React renders on the server; this does not. */
const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect

/*
 * "Has this rendered on a client yet."
 *
 * `useSyncExternalStore` with a server snapshot of `false` rather than a
 * `useState` + `useEffect` pair: setting state in an effect body to detect
 * hydration is a cascading render, and React's own lint rule refuses it. This
 * subscribes to nothing and simply returns a different answer on the two sides,
 * which is exactly the question being asked.
 */
const subscribeToNothing = () => () => {}

function useHydrated() {
  return React.useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  )
}

function useReplay(enabled: boolean, ref: React.RefObject<HTMLElement | null>, endAt: number) {
  /*
   * Starts *finished*.
   *
   * The server renders the completed state, so a visitor with JavaScript off or
   * reduced motion on gets the finished brand rather than an empty frame — and
   * the `<noscript>` reveal override on the page does not have to know anything
   * about this component. The client rewinds to zero in a layout effect, before
   * paint, so nobody sees the end state flash past on the way to the beginning.
   */
  const [phase, setPhase] = React.useState<Phase>({ t: endAt, running: false })

  const start = React.useCallback(() => setPhase({ t: 0, running: true }), [])

  /*
   * The replay waits until it is on screen.
   *
   * It used to start on mount, which is correct on a desktop where the panel is
   * in the first viewport and wrong everywhere else. Measured on a 390×844
   * phone the panel's top edge sat 626px down, so all nine seconds — the whole
   * demonstration this page is built around — played out below the fold and the
   * visitor scrolled down to a finished still. The one thing the page has to
   * show was the one thing a phone never saw.
   *
   * An observer decides, and nothing else does. The first version also carried
   * a fast path — measure the panel in the layout effect, and if it was already
   * inside the first viewport, rewind synchronously before paint to avoid a
   * one-frame flash of the finished state. Measured, that path fired on a
   * 390×844 phone too: at layout-effect time the fonts and images above the
   * panel have not settled, so it sat higher up the document than it ends up,
   * the check passed, and the replay started off-screen exactly as before. A
   * position read before layout settles is not a position.
   *
   * So the observer owns it in every case. Until it fires the panel holds at
   * the finished state, which is a perfectly good poster frame and the same
   * thing a no-JS or reduced-motion visitor gets.
   */
  useIsomorphicLayoutEffect(() => {
    if (!enabled) return

    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          start()
          observer.disconnect()
        }
      },
      /*
       * Sixty per cent, measured rather than picked.
       *
       * At 0.35 this still fired at load on a phone: the panel is 616px tall
       * and its top 243px peek into an 844px fold, which is 39% — over the
       * threshold, so the replay started while only the header row and the
       * brief were on screen. 0.6 needs 370px of it, which a phone reaches
       * about 130px into the scroll and a desktop satisfies immediately.
       */
      { threshold: 0.6 },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [enabled, start, ref])

  React.useEffect(() => {
    if (!phase.running) return

    const id = setInterval(() => {
      setPhase((current) => {
        if (!current.running) return current
        const next = current.t + TICK
        return next >= endAt ? { t: endAt, running: false } : { t: next, running: true }
      })
    }, TICK)

    return () => clearInterval(id)
  }, [phase.running, endAt])

  return { t: phase.t, running: phase.running, start }
}

/* ------------------------------------------------------------- the panel --- */

type Step = { key: string; label: string; detail: string }

export function RunPanel({
  strings,
  steps,
}: {
  strings: {
    replay: string
    replayAction: string
    files: string
    briefBusiness: string
    briefMarket: string
    briefStyle: string
    labelBusiness: string
    labelMarket: string
    labelStyle: string
    done: string
    status: string
    statusDone: string
    header: string
    logoAlt: string
    socialAlt: string
  }
  steps: Step[]
}) {
  const reduced = useReducedMotion()

  /*
   * Nothing motion-dependent renders until after hydration.
   *
   * `useReducedMotion` cannot know the answer on the server, so branching on it
   * during the first render is a hydration mismatch waiting for the first
   * visitor who has the setting on. Gating on hydration makes the server output
   * unconditional — the finished run, which is also exactly what someone
   * without JavaScript should be left looking at.
   */
  const figureRef = React.useRef<HTMLElement>(null)
  const timeline = React.useMemo(() => timelineFor(steps.length), [steps.length])
  const plays = useHydrated() && !reduced
  const { t, running, start } = useReplay(plays, figureRef, timeline.end)

  const brief = [
    { label: strings.labelBusiness, value: strings.briefBusiness },
    { label: strings.labelMarket, value: strings.briefMarket },
    { label: strings.labelStyle, value: strings.briefStyle },
  ]

  /* How far each step has got, 0 → 1. */
  const progressOf = (index: number) =>
    Math.max(0, Math.min(1, (t - (STEPS_AT + index * STEP_MS)) / STEP_MS))

  const doneCount = steps.filter((_, index) => progressOf(index) >= 1).length
  const converged = t >= timeline.converge
  const finished = t >= timeline.done

  /*
   * The flip. Until `branding` lands, the panel is lit in Brandora's violet;
   * after it, in the colour the run just chose. `--accent-surface` is the one
   * variable every lit edge, bloom and rail reads, so re-pointing it here moves
   * the whole panel at once rather than a list of elements agreeing to change.
   */
  /*
   * Gold and rose, not the brand's primary.
   *
   * Sultana's primary is #1B3A3A, and measured on this panel's near-black
   * ground it is very nearly nothing — the flip happened and the progress bars
   * simply went dark. Picking the palette member that survives the ground it is
   * drawn on is the same judgement `brandTheme` makes for text, applied to
   * light: on Room Black those are the gold and the rose, and both of them are
   * unmistakably this brand rather than ours.
   */
  const handedOver = doneCount >= 1
  const accent = handedOver
    ? ({
        '--accent-surface': PALETTE[1],
        '--accent-surface-2': PALETTE[2],
      } as React.CSSProperties)
    : undefined

  /* The clock, scaled from the replay's nine seconds to the run's real minute. */
  const seconds = Math.min(REAL_SECONDS, Math.round((t / timeline.end) * REAL_SECONDS))
  const clock = `00:${String(seconds).padStart(2, '0')}`

  return (
    <figure ref={figureRef} className="m-0">
      <div
        className="lit [--lit-radius:var(--radius-panel)] transition-[background-image] duration-700"
        style={accent}
      >
        <div className="lit-inner bloom flex flex-col p-4 [--bloom-strength:16%] sm:p-6">
          {/* ------------------------------------------------------ header */}
          <div className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden
                className={cn(
                  'size-1.5 shrink-0 rounded-full bg-[var(--accent-surface)]',
                  running && 'pulse-brand',
                )}
              />
              <span className="type-eyebrow truncate text-fg-secondary">{strings.header}</span>
            </span>
            {/* `type-eyebrow`, not a second hand-rolled mono spec. The label to
                its left and this clock are the same voice — the run reporting
                itself — and they were set 11px/500/0.16em against 12px/400/normal
                on the same row. */}
            <span className="machine-value type-eyebrow text-fg-muted tabular-nums">{clock}</span>
          </div>

          {/* ------------------------------------------------------- brief */}
          {/*
            Revealed a line at a time, not a character at a time.

            A typewriter effect would break Arabic outright — letterforms join,
            so revealing a word one glyph at a time renders a sequence of
            disconnected shapes that are not the word. The Word-Not-Letter Rule
            exists for the headline and applies here for the same reason. A line
            arriving with a caret behind it reads as typing in both scripts.
          */}
          <dl className="mt-5 space-y-1.5 border-t border-line pt-4">
            {brief.map((row, index) => (
              <div
                key={row.label}
                className="flex gap-3 transition-opacity duration-300"
                style={{ opacity: t >= BRIEF_AT[index] ? 1 : 0 }}
              >
                <dt className="type-eyebrow w-20 shrink-0 pt-0.5 text-fg-muted">{row.label}</dt>
                <dd className="min-w-0 text-sm text-fg-secondary">
                  {row.value}
                  {t >= BRIEF_AT[index] && t < (BRIEF_AT[index + 1] ?? STEPS_AT) && (
                    <span aria-hidden className="ms-0.5 inline-block animate-pulse">▍</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>

          {/* ------------------------------------- steps, or the convergence */}
          <div className="relative mt-5 min-h-[19rem] border-t border-line pt-4 sm:min-h-[17rem]">
            <div
              className="transition-opacity duration-500"
              style={{ opacity: converged ? 0 : 1, pointerEvents: converged ? 'none' : undefined }}
              aria-hidden={converged}
            >
              <ol className="space-y-2.5">
                {steps.map((step, index) => {
                  const progress = progressOf(index)
                  const active = progress > 0 && progress < 1

                  return (
                    <li key={step.key} className="grid grid-cols-[5.5rem_1fr_1rem] items-center gap-3">
                      <span
                        className={cn(
                          'type-eyebrow truncate transition-colors duration-300',
                          progress > 0 ? 'text-fg' : 'text-fg-muted',
                        )}
                      >
                        {step.label}
                      </span>

                      {/* The bar is a block child, so it fills from the inline
                          start and mirrors under RTL without a second rule. */}
                      <span className="h-1 overflow-hidden rounded-full bg-elevated">
                        <span
                          className="block h-full rounded-full bg-[var(--accent-surface)] transition-[width] duration-150 ease-linear"
                          style={{ width: `${progress * 100}%` }}
                        />
                      </span>

                      <span className="flex size-4 items-center justify-center">
                        {progress >= 1 && (
                          <Check className="size-3.5 text-[var(--accent-surface)]" aria-hidden />
                        )}
                      </span>

                      <p
                        className="col-start-2 -mt-1 text-xs text-fg-muted transition-opacity duration-300"
                        style={{ opacity: active || progress >= 1 ? 1 : 0 }}
                      >
                        {step.detail}
                      </p>
                    </li>
                  )
                })}
              </ol>

              {/* The artifact the run has just made, swapped as each step lands.
                  The full inventory is the contact sheet's job; this strip is
                  here to show things arriving, not to list them. */}
              <div className="mt-4 h-20">
                <Payload
                  index={doneCount}
                  logoAlt={strings.logoAlt}
                  socialAlt={strings.socialAlt}
                />
              </div>
            </div>

            {/* The four kinds of artifact, pulling in around the name they all
                belong to. This is the argument the page exists to make, and it
                is the one moment worth a spring. */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-700"
              style={{ opacity: converged ? 1 : 0, pointerEvents: converged ? undefined : 'none' }}
              aria-hidden={!converged}
            >
              <Convergence active={converged} reduced={!plays} alt={strings.logoAlt} />
              <p
                className="mt-4 max-w-[28ch] text-center text-sm text-fg-secondary transition-opacity duration-500"
                style={{ opacity: finished ? 1 : 0 }}
              >
                {strings.done}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/*
        The run's progress, for a reader who is not watching it.

        The panel is otherwise motion-only, which makes its whole argument
        invisible to a screen reader. This also closes a standing finding
        against the app's generation panel: a ninety-second run with no live
        region announces nothing at all.
      */}
      <p className="sr-only" role="status" aria-live="polite">
        {finished
          ? strings.statusDone
          : doneCount > 0
            ? strings.status
                .replace('{step}', steps[Math.min(doneCount, steps.length - 1)].label)
                .replace('{index}', String(Math.min(doneCount + 1, steps.length)))
                .replace('{total}', String(steps.length))
            : ''}
      </p>

      <figcaption className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span className="text-xs text-fg-muted">
          {strings.replay} · {strings.files}
        </span>

        {/* Present only once the run has finished, and never on a loop: a
            permanent animation in the corner of the eye is a permanent
            distraction, which is why nothing in this system repeats forever
            except a job that is genuinely running. */}
        {plays && !running && (
          <Button size="sm" variant="ghost" onClick={start} className="-me-2 h-11 sm:h-9">
            {strings.replayAction}
          </Button>
        )}
      </figcaption>
    </figure>
  )
}

/* ------------------------------------------------------------- fragments --- */

/** What the run has produced so far, one artifact at a time. */
function Payload({
  index,
  logoAlt,
  socialAlt,
}: {
  index: number
  logoAlt: string
  socialAlt: string
}) {
  const panes = [
    null,
    /* branding — the name it chose, and the colours it chose with it */
    <div key="branding" className="flex h-full items-center gap-3">
      <p className="font-display text-2xl font-semibold tracking-[-0.02em]">Sultana</p>
      <span className="flex flex-1 gap-1.5">
        {PALETTE.map((hex) => (
          <span
            key={hex}
            className="h-10 flex-1 rounded-control"
            style={{ backgroundColor: hex }}
          />
        ))}
      </span>
    </div>,
    /* logos — the four traced variants */
    <div key="logos" className="grid h-full grid-cols-4 gap-2">
      {LOGOS.map((logo) => (
        <span key={logo.src} className="overflow-hidden rounded-control bg-white/95">
          <Image
            src={logo.src}
            alt={logoAlt}
            width={logo.width}
            height={logo.height}
            className="size-full object-contain p-1.5"
            sizes="80px"
          />
        </span>
      ))}
    </div>,
    /* website — the pages the run decided this business needed */
    <div key="website" className="flex h-full flex-wrap content-center gap-2">
      {['Home', 'About', 'Menu', 'Contact'].map((page) => (
        <span
          key={page}
          className="machine-value rounded-full border border-line px-3 py-1.5 font-mono text-xs text-fg-secondary"
        >
          /{page.toLowerCase()}
        </span>
      ))}
    </div>,
    /* social — four of the eight designed posts */
    <div key="social" className="grid h-full grid-cols-4 gap-2">
      {POSTS.map((post) => (
        <span key={post} className="overflow-hidden rounded-control bg-white/95">
          <Image
            src={post}
            alt={socialAlt}
            width={1080}
            height={1080}
            className="size-full object-cover"
            sizes="80px"
          />
        </span>
      ))}
    </div>,
    /* kit — the two faces, which is what the document opens on */
    <div key="kit" className="flex h-full flex-col justify-center">
      <p className="text-lg font-semibold">{FONTS.heading}</p>
      <p className="text-sm text-fg-secondary">{FONTS.body}</p>
    </div>,
  ]

  return (
    <div className="relative h-full">
      {panes.map((pane, paneIndex) =>
        pane ? (
          <div
            key={paneIndex}
            className="absolute inset-0 transition-opacity duration-500"
            style={{ opacity: paneIndex === index ? 1 : 0 }}
            aria-hidden={paneIndex !== index}
          >
            {pane}
          </div>
        ) : null,
      )}
    </div>
  )
}

/**
 * The four kinds of artifact, arriving around the name they belong to.
 *
 * A 3×3 grid rather than computed polar coordinates: the four cardinal cells are
 * the four points, the centre holds the wordmark, and the whole thing reflows
 * and mirrors on its own. Each piece animates in from an offset that points
 * away from the centre, so they read as converging rather than as fading up.
 */
function Convergence({
  active,
  reduced,
  alt,
}: {
  active: boolean
  reduced: boolean
  alt: string
}) {
  const spring = { type: 'spring', visualDuration: 0.55, bounce: 0.32 } as const

  const cell = 'flex items-center justify-center'
  /* Every piece sits on the brand's own paper, which is also what makes four
     unlike objects — a swatch row, a mark, a photograph, a word — read as one
     set rather than as four cut-outs. The colour comes from the palette
     constant rather than a literal, so there is one place it is written down. */
  const tile =
    'flex items-center justify-center rounded-control shadow-[var(--shadow-soft)]'
  const paper = { backgroundColor: PALETTE[3] }
  /* An edge drawn from the brand's own darkest colour, so a swatch stays a
     swatch on its own paper without introducing a grey the palette does not
     contain. An inset shadow rather than a ring: it needs no Tailwind internals
     and it does not grow the 16px dot it is drawn on. */
  const swatchEdge = `inset 0 0 0 1px color-mix(in srgb, ${PALETTE[0]} 20%, transparent)`

  const pieces = [
    {
      area: 'col-start-2 row-start-1',
      from: { y: -48 },
      node: (
        <span className={cn(tile, 'gap-1.5 px-3 py-2.5')} style={paper}>
          {/* Ringed, because the fourth colour *is* this tile's paper — without
              an edge the palette shows three dots and a gap. */}
          {PALETTE.map((hex) => (
            <span
              key={hex}
              className="size-4 rounded-full"
              style={{ backgroundColor: hex, boxShadow: swatchEdge }}
            />
          ))}
        </span>
      ),
    },
    {
      area: 'col-start-3 row-start-2',
      from: { x: 48 },
      node: (
        <span className={cn(tile, 'size-16 p-1.5')} style={paper}>
          <Image
            src={LOGOS[1].src}
            alt={alt}
            width={LOGOS[1].width}
            height={LOGOS[1].height}
            className="size-full object-contain"
            sizes="64px"
          />
        </span>
      ),
    },
    {
      area: 'col-start-2 row-start-3',
      from: { y: 48 },
      node: (
        <span className={cn(tile, 'size-16 overflow-hidden p-0')} style={paper}>
          <Image
            src={POSTS[0]}
            alt={alt}
            width={1080}
            height={1080}
            className="size-full rounded-control object-cover"
            sizes="64px"
          />
        </span>
      ),
    },
    {
      area: 'col-start-1 row-start-2',
      from: { x: -48 },
      node: (
        <span
          className={cn(tile, 'px-3 py-2.5 text-center text-xs leading-tight')}
          style={{ ...paper, color: PALETTE[0] }}
        >
          {FONTS.heading}
        </span>
      ),
    },
  ]

  return (
    /*
     * A square 3×3 with equal tracks, so the four points sit at one radius from
     * the centre instead of wherever their own content happens to end. The
     * pieces animate in from an offset pointing away from the middle, which is
     * what makes this read as converging rather than as four things fading up.
     */
    <div className="grid aspect-square w-full max-w-[20rem] grid-cols-3 grid-rows-3 place-items-center gap-2">
      {pieces.map((piece) => (
        <motion.div
          key={piece.area}
          className={cn(cell, piece.area)}
          initial={reduced ? false : { opacity: 0, scale: 0.7, ...piece.from }}
          animate={active ? { opacity: 1, scale: 1, x: 0, y: 0 } : undefined}
          transition={spring}
        >
          {piece.node}
        </motion.div>
      ))}

      <motion.div
        className={cn(cell, 'col-start-2 row-start-2')}
        initial={reduced ? false : { opacity: 0, scale: 0.6 }}
        animate={active ? { opacity: 1, scale: 1 } : undefined}
        transition={{ ...spring, delay: reduced ? 0 : 0.12 }}
      >
        <span className={cn(tile, 'px-2.5 py-2')} style={paper}>
          <Image
            src={LOGOS[0].src}
            alt={alt}
            width={LOGOS[0].width}
            height={LOGOS[0].height}
            className="h-9 w-auto object-contain"
            sizes="140px"
          />
        </span>
      </motion.div>
    </div>
  )
}
