'use client'

import { AlertCircle, Check, Loader2, MailWarning, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { FieldError } from '@/components/ui/field-error'
import { EmailVerification } from '@/components/features/settings/email-verification'
import { Link, usePathname, useRouter } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { EVENTS, capture } from '@/lib/analytics'
import { generateProject } from '@/server/actions/generation'

type StepStatus = 'pending' | 'running' | 'done' | 'failed'

/**
 * Mirrors generation_jobs.progress, whose status is a plain string in JSONB.
 *
 * `concepts` is written only under `logos`, by `noteLogoConcept`, and climbs as
 * each drawn concept reaches storage.
 */
type Progress = Record<string, { status?: string; error?: string; concepts?: number }>

function stepStatus(value: string | undefined): StepStatus {
  return value === 'running' || value === 'done' || value === 'failed' ? value : 'pending'
}

export function GenerationPanel({
  projectId,
  sections,
  initialStatus,
  initialProgress,
  creditBalance,
  creditCost,
  mustVerify,
  userEmail,
  brandName,
}: {
  projectId: string
  sections: string[]
  initialStatus: string
  initialProgress: Progress
  creditBalance: number
  creditCost: number
  /** Whether this account still owes a confirmed address before it can run
      again — the first run is not gated. The panel has to be able to say so. */
  mustVerify: boolean
  userEmail: string
  /** What to call the brand when the run that made it finishes. */
  brandName: string
}) {
  const t = useTranslations('Generation')
  const ts = useTranslations('Settings')
  const router = useRouter()
  const pathname = usePathname()
  /*
   * The tab lives in the URL and this panel does not remount when it changes —
   * it sits above the tabs, so React keeps it in place. Reading the tab makes
   * it a dependency of the subscription below, which is what lets a stream
   * that closed on an idle project reopen when the customer comes back to a
   * page where work has since started.
   */
  const tab = useSearchParams().get('tab')

  const [progress, setProgress] = useState<Progress>(initialProgress)
  const [status, setStatus] = useState(initialStatus)
  const sourceRef = useRef<EventSource | null>(null)
  /*
   * Which steps were already finished when this page was rendered.
   *
   * Seeded from the server's own view rather than starting empty: a page
   * loaded onto a job that has already finished a section must not treat that
   * section as news and reload itself over it.
   */
  const revealed = useRef<Set<string>>(
    new Set(
      Object.entries(initialProgress)
        .filter(([, step]) => step?.status === 'done')
        .map(([name]) => name),
    ),
  )

  /**
   * How many logo concepts this page was rendered knowing about.
   *
   * Seeded from the server's own view for the same reason `revealed` is:
   * arriving at a finished run must not treat work done last week as news.
   */
  const conceptsSeen = useRef(initialProgress.logos?.concepts ?? 0)

  /*
   * True only for a run that finished while somebody was watching.
   *
   * The distinction is the whole design. Arriving at a brand generated last
   * week should show nothing; the ninety seconds that just passed should be
   * acknowledged. Keyed on the transition rather than on the status, so the
   * moment cannot re-fire on a refresh — and so the freelancer on their tenth
   * run is not congratulated ten times a day for the same thing.
   */
  const [justFinished, setJustFinished] = useState(false)

  /*
   * What the job actually took.
   *
   * A run that fails halfway is charged for the sections it delivered and
   * refunded the rest, and the panel used to offer "Try again" without saying
   * either — so the one question a customer has after a failure ("did that
   * cost me nine credits?") had no answer on the screen where it was asked.
   */
  const [charged, setCharged] = useState<number | null>(null)

  /*
   * Whether this page has actually seen the job running.
   *
   * The stream replays its `done` event to whoever connects, so a completed
   * project announces itself as finished on every single mount — which made
   * the note appear when simply arriving at a brand generated last week. The
   * moment belongs to the transition, so the transition is what is recorded.
   */
  const witnessedRun = useRef(false)

  /**
   * The last progress payload, for the event fired when the run ends.
   *
   * A ref rather than the state above because `subscribe` is memoised and would
   * read whatever `progress` was when it was built — which, for the run that
   * matters, is empty.
   */
  const latestProgress = useRef<Progress>(initialProgress)

  const isRunning = status === 'queued' || status === 'generating' || status === 'running'

  /*
   * A boolean rather than the array itself, because it feeds the subscription
   * callback's dependencies. `sections` is a new array on every render, so
   * depending on it directly would rebuild `subscribe`, re-run the effect below
   * and tear down and reopen the stream on every render.
   */
  const producesLogos = sections.includes('branding')

  useEffect(() => {
    if (isRunning) witnessedRun.current = true
  }, [isRunning])

  /** Opens the SSE stream and mirrors job state into local state. */
  const subscribe = useCallback(() => {
    if (sourceRef.current) return

    const source = new EventSource(`/api/generate/${projectId}/stream`)
    sourceRef.current = source

    source.addEventListener('progress', (event) => {
      const payload = JSON.parse((event as MessageEvent).data)
      const next: Progress = payload.progress ?? {}
      setProgress(next)
      setStatus(payload.status)
      latestProgress.current = next

      /*
       * Show the brand when it exists, not when the run ends.
       *
       * The sections take wildly different amounts of time. The naming, the
       * website and the social copy are all in within about forty-five
       * seconds; the logos take another hundred on top, because drawing two
       * images is simply slower than writing text. The page waited for all of
       * it, so a customer whose brand had been sitting finished in the
       * database for a minute and a half was still watching a spinner — which
       * is most of why a run "takes two minutes".
       *
       * `router.refresh()` is what this should be, and it now is. It was tried
       * before and did not commit — the RSC request went out on every landing
       * and the DOM kept the old output — because a Suspense boundary further
       * down this page blocked the transition. With that gone, every section
       * can paint as it lands instead of one reveal and a reload at the end:
       * the guard that allowed a single jolt per page went with the jolt.
       *
       * `revealed` is seeded from the progress this page was rendered with, so
       * arriving at a finished job refreshes nothing. Without that it is the
       * same loop the `done` handler below documents — and the refs survive a
       * refresh, which is exactly why a refresh cannot chase its own tail here.
       */
      const sectionLanded = Object.entries(next).some(
        ([name, step]) => step?.status === 'done' && !revealed.current.has(name),
      )

      for (const [name, step] of Object.entries(next)) {
        if (step?.status === 'done') revealed.current.add(name)
      }

      /*
       * A drawn concept counts as something landing, the same as a section.
       *
       * The logo step is the long pole and it announces nothing until it is
       * completely finished — after both images, both vectorisations and the
       * derived favicon and avatars. The first concept is in storage and worth
       * looking at tens of seconds before that, so the page stops waiting for
       * the paperwork.
       *
       * Both concepts are drawn concurrently and land within moments of each
       * other. That was two jolts for one piece of news while this reloaded;
       * as a refresh it is two paints, which is what a page doing work should
       * look like.
       */
      const conceptLanded = (next.logos?.concepts ?? 0) > conceptsSeen.current
      conceptsSeen.current = Math.max(conceptsSeen.current, next.logos?.concepts ?? 0)

      const landedNow = sectionLanded || conceptLanded

      if (landedNow && witnessedRun.current) {
        if (producesLogos) router.replace(pathname)
        router.refresh()
      }
    })

    source.addEventListener('done', (event) => {
      const payload = JSON.parse((event as MessageEvent).data)
      source.close()
      sourceRef.current = null

      /*
       * 'idle' means there is no job row at all, which says nothing about the
       * project. Adopting it as a status turned a finished brand back into an
       * un-generated one: the header read "Completed" while the panel above the
       * work offered to generate it. Only a real job status replaces what the
       * page was rendered with.
       */
      if (payload.status === 'idle') return

      setStatus(payload.status)
      if (typeof payload.creditsCharged === 'number') setCharged(payload.creditsCharged)
      if (payload.status === 'completed' && witnessedRun.current) setJustFinished(true)

      /*
       * How many runs fail, and at which section.
       *
       * Behind `witnessedRun` for the reason the note above gives: `done` is
       * replayed to everyone who opens a finished project, so without the guard
       * a brand generated last week is counted again on every visit — and a
       * failure rate is exactly the number that ruins. The cost is a run that
       * finishes while nobody is looking, which is counted at neither end.
       */
      if (witnessedRun.current) {
        const failedAt = Object.entries(latestProgress.current).find(
          ([, step]) => step?.status === 'failed',
        )?.[0]
        capture(EVENTS.generationFinished, {
          status: payload.status,
          section: failedAt ?? 'none',
          creditsCharged: payload.creditsCharged ?? 0,
        })
      }

      /*
       * A run that drew new logos invalidates any round pinned in the URL.
       *
       * Choosing a concept puts `round` and `concept` there, and the page
       * resolves the canvas from them — so refreshing while still pinned
       * re-rendered the round the customer had been browsing and left the work
       * that just finished off screen entirely. It read as a generation that
       * had produced nothing.
       *
       * Guarded on the job actually including logos: a website-only or
       * social-only run must not yank someone off a round they deliberately
       * opened.
       */
      /*
       * A refresh, and — for a run that drew logos — a replace first.
       *
       * This was a full page load, because the refresh did not commit here: the
       * run finished, the component re-rendered with fresh server props, and
       * the DOM kept the old output. The cause was a Suspense boundary further
       * down this page blocking the transition a refresh runs in. It is gone,
       * so the end of a run no longer throws the page away to show what it
       * made — which matters most at exactly this moment, the ninety seconds
       * the product is sold on.
       *
       * The replace still earns its place for a logo run: it drops the pinned
       * `round` and `concept`, which that run has invalidated. `pathname` from
       * next-intl carries no locale prefix and its router puts one back, so
       * nothing here has to reconstruct it.
       */
      /*
       * Only for a run this page actually watched.
       *
       * `done` also arrives the moment the stream opens on a project whose job
       * finished long ago — that is how the panel learns the final state on a
       * cold load. Reloading on that is a loop: the fresh page opens the stream,
       * is told the job is done, and reloads again. It ran 143 times before
       * this guard existed. `witnessedRun` is only set while a run is actually
       * in flight, which is exactly the case where the page is now out of date.
       */
      if (!witnessedRun.current) return

      if (producesLogos) router.replace(pathname)
      router.refresh()
    })

    source.addEventListener('error', () => {
      source.close()
      sourceRef.current = null
    })
    /*
     * `router` and `pathname` are in here because the callback reads them, and
     * they are safe to be: next-intl memoises the router per locale and route,
     * and `pathname` carries no query, so neither identity moves when the
     * replace above drops a pinned round. A dependency that did move would tear
     * this stream down and open it again mid-run.
     */
  }, [projectId, producesLogos, router, pathname])

  /*
   * `executeAsync`, because `onSuccess` is where the tail was started.
   *
   * That callback does not fire in this codebase — measured with probes on a
   * production build — so `subscribe()` was never called and the panel sat
   * showing nothing while a real run proceeded behind it. Awaiting the result
   * is the same information without depending on a callback that never comes.
   */
  const { executeAsync, isPending, result } = useAction(generateProject)

  async function start() {
    const outcome = await executeAsync({ projectId })
    if (!outcome?.data) return
    capture(EVENTS.generationStarted)
    setStatus('queued')
    subscribe()
  }

  /*
   * Always check live state on mount rather than trusting what the page was
   * rendered with.
   *
   * Moving between tabs is a client navigation, so Next can serve a cached RSC
   * payload from before a job started — the generation then appears to have
   * vanished until a hard refresh. The stream answers immediately and closes
   * when nothing is running, so this costs one indexed read for a project that
   * is idle, and self-corrects one that is not.
   *
   * Re-run on the tab as well as on mount. A stream that closed because there
   * was no job stays closed, so without this the panel is deaf to a run that
   * starts afterwards — which is the "vanished until a hard refresh" failure
   * again, one navigation later.
   */
  useEffect(() => {
    subscribe()
    return () => {
      sourceRef.current?.close()
      sourceRef.current = null
    }
  }, [subscribe, tab])

  const canAfford = creditBalance >= creditCost

  /*
   * The wall, recorded where a customer actually meets it.
   *
   * Not on the server's refusal: the button is disabled before the action can
   * be called, so almost nobody reaches that error. What is worth counting is
   * being shown the price and not being able to pay it — that is the moment a
   * free customer either buys credits or leaves, and the whole point of the
   * event is finding out which.
   */
  useEffect(() => {
    if (!canAfford) capture(EVENTS.creditsExhausted, { where: 'generation', needed: creditCost })
  }, [canAfford, creditCost])

  /*
   * The end of the run, which used to be a component unmounting.
   *
   * Everything this product sells happens in the ninety seconds that just
   * passed, and the interface marked it by disappearing: `return null`, content
   * silently in its place. This names what arrived and points at it, then
   * retires — it is a handover, not a trophy, so there is no confetti and no
   * sound, and it is gone the moment it has been read.
   */
  if (status === 'completed' && justFinished) {
    return (
      <Card className="space-y-5 glow-brand">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/15">
            <Sparkles className="size-4 text-brand" />
          </span>
          <div className="min-w-0">
            <CardTitle>{t('doneTitle', { brand: brandName })}</CardTitle>
            <CardDescription className="mt-1">{t('doneBody')}</CardDescription>
          </div>
        </div>

        {/* What arrived, named — the run's own manifest rather than a count. */}
        <ul className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {sections.map((section) => (
            <li key={section} className="flex items-center gap-2.5">
              <Check className="size-4 shrink-0 text-success" />
              <span className="text-fg-secondary">{t(`produced.${section}`)}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => {
              document
                .getElementById('brand')
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              setJustFinished(false)
            }}
          >
            {t('doneCta')}
          </Button>
          <Button variant="ghost" onClick={() => setJustFinished(false)}>
            {t('doneDismiss')}
          </Button>
        </div>
      </Card>
    )
  }

  /*
   * Hidden rather than unmounted: returning null still runs the effect above,
   * which is what lets a stale "completed" correct itself into showing a run
   * that is actually in progress.
   */
  if (status === 'completed') return null

  return (
    <Card
      className={cn(
        'space-y-5 transition-colors duration-300',
        isRunning && 'border-brand/30',
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <CardTitle>{isRunning ? t('running') : t('title')}</CardTitle>
          <CardDescription className="mt-1">
            {isRunning ? t('runningBody') : t('body', { credits: creditCost })}
          </CardDescription>
        </div>

        {!isRunning && (
          <Button
            onClick={start}
            disabled={isPending || !canAfford || mustVerify}
          >
            {isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {status === 'failed' || status === 'partial' ? t('retry') : t('generate')}
          </Button>
        )}
      </div>

      {/*
        The block, said before it is hit rather than after.

        An unverified address makes the server refuse this run, and the panel
        used to offer the button anyway: you pressed Generate, waited, and got
        an error naming a step you had no way to take from here. Saying it up
        front — with the control attached — turns a refusal into an instruction.
      */}
      {mustVerify && !isRunning && (
        <div className="rounded-control border border-warning/30 bg-warning/[0.07] p-4">
          <div className="flex items-start gap-3">
            <MailWarning className="mt-0.5 size-4 shrink-0 text-warning" />
            <div className="min-w-0">
              <p className="text-sm font-medium">{ts('unverifiedTitle')}</p>
              <p className="mt-1 text-sm text-fg-secondary">
                {ts('unverifiedBody', { email: userEmail })}
              </p>
              <div className="mt-3.5">
                <EmailVerification email={userEmail} />
              </div>
            </div>
          </div>
        </div>
      )}

      {(isRunning || status === 'partial' || status === 'failed') && (
        <ol className="space-y-2 stagger-children">
          {sections.map((section, index) => {
            const state = stepStatus(progress[section]?.status)
            return (
              <li
                key={section}
                style={{ '--i': index } as React.CSSProperties}
                className={cn(
                  'relative flex items-center gap-3 overflow-hidden rounded-control border border-line px-4 py-3 text-sm transition-colors duration-300',
                  state === 'running' && 'border-brand/40 bg-brand/5',
                  state === 'done' && 'border-success/30',
                )}
              >
                {/*
                  A band of light crossing only the step that is running. One
                  moving element at a time is what makes the list read as work
                  in progress rather than as decoration.
                */}
                {state === 'running' && (
                  <span aria-hidden className="absolute inset-0 shimmer-surface" />
                )}
                <StepIcon status={state} />
                <span
                  className={cn(
                    'relative transition-colors duration-300',
                    state === 'pending' && 'text-fg-muted',
                    state === 'running' && 'font-medium text-fg',
                  )}
                >
                  {t(`steps.${section}`)}
                </span>
                {progress[section]?.error && (
                  <span className="ms-auto text-xs text-danger">{progress[section].error}</span>
                )}
              </li>
            )
          })}
        </ol>
      )}

      {/* Said before the retry, because it is what decides whether to retry. */}
      {(status === 'failed' || status === 'partial') && charged !== null && (
        <p className="text-sm text-fg-secondary">
          {charged > 0 ? t('failedCharged', { credits: charged }) : t('failedNoCharge')}
        </p>
      )}

      {/*
        The wall with the way past it.

        This is the one a returning customer actually meets — they came back to
        generate, and the balance is what stops them — and it was the only one of
        the four that named the problem and offered nothing. The kit, the logo
        composer and the wizard have all pointed at billing from here; this said
        "you have 3" and left the customer to find the page themselves.
      */}
      {!canAfford && !isRunning && (
        <p role="alert" className="text-sm text-danger">
          {t('insufficientCredits', { needed: creditCost, balance: creditBalance })}{' '}
          <Link href="/dashboard/billing" className="underline underline-offset-2">
            {t('topUp')}
          </Link>
        </p>
      )}

      <FieldError message={result?.serverError} />
    </Card>
  )
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === 'done') return <Check className="size-4 shrink-0 text-success" />
  if (status === 'failed') return <AlertCircle className="size-4 shrink-0 text-danger" />
  if (status === 'running') {
    return (
      <span className="relative flex size-4 shrink-0 items-center justify-center rounded-full pulse-brand">
        <Loader2 className="size-4 animate-spin text-brand" />
      </span>
    )
  }
  return <span className="size-4 shrink-0 rounded-full border border-line-strong" />
}
