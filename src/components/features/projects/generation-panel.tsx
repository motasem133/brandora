'use client'

import { AlertCircle, Check, Loader2, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { FieldError } from '@/components/ui/field-error'
import { useRouter } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { EVENTS, capture } from '@/lib/analytics'
import { generateProject } from '@/server/actions/generation'

type StepStatus = 'pending' | 'running' | 'done' | 'failed'

/** Mirrors generation_jobs.progress, whose status is a plain string in JSONB. */
type Progress = Record<string, { status?: string; error?: string }>

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
}: {
  projectId: string
  sections: string[]
  initialStatus: string
  initialProgress: Progress
  creditBalance: number
  creditCost: number
}) {
  const t = useTranslations('Generation')
  const router = useRouter()
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

  const isRunning = status === 'queued' || status === 'generating' || status === 'running'

  /** Opens the SSE stream and mirrors job state into local state. */
  const subscribe = useCallback(() => {
    if (sourceRef.current) return

    const source = new EventSource(`/api/generate/${projectId}/stream`)
    sourceRef.current = source

    source.addEventListener('progress', (event) => {
      const payload = JSON.parse((event as MessageEvent).data)
      setProgress(payload.progress ?? {})
      setStatus(payload.status)
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
      // Pull the freshly generated assets into the server-rendered page.
      router.refresh()
    })

    source.addEventListener('error', () => {
      source.close()
      sourceRef.current = null
    })
  }, [projectId, router])

  const { execute, isPending, result } = useAction(generateProject, {
    onSuccess: () => {
      capture(EVENTS.generationStarted)
      setStatus('queued')
      subscribe()
    },
  })

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
          <Button onClick={() => execute({ projectId })} disabled={isPending || !canAfford}>
            {isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {status === 'failed' || status === 'partial' ? t('retry') : t('generate')}
          </Button>
        )}
      </div>

      {(isRunning || status === 'partial' || status === 'failed') && (
        <ol className="space-y-2 stagger-children">
          {sections.map((section, index) => {
            const state = stepStatus(progress[section]?.status)
            return (
              <li
                key={section}
                style={{ '--i': index } as React.CSSProperties}
                className={cn(
                  'relative flex items-center gap-3 overflow-hidden rounded-lg border border-line px-4 py-3 text-sm transition-colors duration-300',
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

      {!canAfford && !isRunning && (
        <FieldError message={t('insufficientCredits', { needed: creditCost, balance: creditBalance })} />
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
