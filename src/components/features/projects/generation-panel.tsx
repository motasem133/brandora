'use client'

import { AlertCircle, Check, Loader2, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { FieldError } from '@/components/ui/field-error'
import { useRouter } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
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

  const [progress, setProgress] = useState<Progress>(initialProgress)
  const [status, setStatus] = useState(initialStatus)
  const sourceRef = useRef<EventSource | null>(null)

  const isRunning = status === 'queued' || status === 'generating' || status === 'running'

  const { execute, isPending, result } = useAction(generateProject, {
    onSuccess: () => setStatus('queued'),
  })

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
      setStatus(payload.status)
      source.close()
      sourceRef.current = null
      // Pull the freshly generated assets into the server-rendered page.
      router.refresh()
    })

    source.addEventListener('error', () => {
      source.close()
      sourceRef.current = null
    })
  }, [projectId, router])

  useEffect(() => {
    if (isRunning) subscribe()
    return () => {
      sourceRef.current?.close()
      sourceRef.current = null
    }
  }, [isRunning, subscribe])

  const canAfford = creditBalance >= creditCost

  if (status === 'completed') return null

  return (
    <Card className="space-y-5">
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
        <ol className="space-y-2">
          {sections.map((section) => {
            const state = stepStatus(progress[section]?.status)
            return (
              <li
                key={section}
                className={cn(
                  'flex items-center gap-3 rounded-lg border border-line px-4 py-3 text-sm',
                  state === 'running' && 'border-brand/40 bg-brand/5',
                )}
              >
                <StepIcon status={state} />
                <span className={cn(state === 'pending' && 'text-fg-muted')}>
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
  if (status === 'running') return <Loader2 className="size-4 shrink-0 animate-spin text-brand" />
  return <span className="size-4 shrink-0 rounded-full border border-line-strong" />
}
