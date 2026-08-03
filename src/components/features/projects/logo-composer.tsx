'use client'

import { Loader2, Send } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'

import { FieldError } from '@/components/ui/field-error'
import { useRouter } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { EVENTS, capture } from '@/lib/analytics'
import { regenerateLogos } from '@/server/actions/generation'

/**
 * The prompt bar under the canvas: say what to change, send, a round starts.
 *
 * It was a bordered panel with a heading, two lines of explanation, a labelled
 * textarea and a wide button — five elements to say one thing. As a composer it
 * says the same thing in a placeholder and a send key, and it sits where the
 * next action belongs, directly beneath the work it changes.
 *
 * (The two-button version this originally replaced — "save direction" then
 * "regenerate" — spent credits on a run that ignored what had just been typed.
 * One control, one meaning.)
 */
export function LogoComposer({
  projectId,
  brief,
  cost,
  affordable,
  isRunning,
}: {
  projectId: string
  brief: string | null
  cost: number
  affordable: boolean
  isRunning: boolean
}) {
  const t = useTranslations('Branding')
  const router = useRouter()

  // Seeded with the last direction, so refining it means editing a sentence
  // rather than remembering what was asked for last time.
  const [text, setText] = useState(brief ?? '')
  const [queued, setQueued] = useState(false)

  const { execute, isPending, result } = useAction(regenerateLogos, {
    onSuccess: () => {
      /*
       * Queueing returns long before anything visible changes. Holding this
       * locally keeps the control showing progress from the moment it is
       * pressed, which is what stopped people pressing it twice.
       */
      capture(EVENTS.logosRegenerated, { cost })
      setQueued(true)
      router.refresh()
    },
    onError: () => setQueued(false),
  })

  const busy = isPending || queued || isRunning
  const disabled = busy || !affordable

  function send() {
    if (disabled) return
    execute({ projectId, brief: text })
  }

  return (
    <div className="space-y-2">
      <div
        className={cn(
          'flex items-end gap-2 rounded-card border border-line bg-surface p-2 transition-colors',
          'focus-within:border-brand/60',
          busy && 'opacity-70',
        )}
      >
        <label htmlFor="logo-direction" className="sr-only">
          {t('directionTitle')}
        </label>

        <textarea
          id="logo-direction"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            // Enter sends, as in any message box. Shift+Enter still breaks a line.
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              send()
            }
          }}
          rows={2}
          disabled={busy}
          placeholder={t('directionPlaceholder')}
          className="min-h-11 w-full resize-none bg-transparent px-2.5 py-2 text-sm placeholder:text-fg-muted focus:outline-none disabled:cursor-not-allowed"
        />

        <button
          onClick={send}
          disabled={disabled}
          title={affordable ? t('sendDirection', { credits: cost }) : t('notEnoughCredits')}
          /*
           * The label carries the state, because the icon cannot. A send
           * control that silently becomes a spinner tells a screen reader
           * nothing about whether the press did anything.
           */
          aria-label={busy ? t('regenerating') : t('sendDirection', { credits: cost })}
          className="grid size-10 shrink-0 place-items-center rounded-control bg-[image:var(--brand-gradient)] text-brand-fg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4 rtl:-scale-x-100" />
          )}
        </button>
      </div>

      <p className="px-1 text-xs text-fg-muted">
        {busy ? t('regenerating') : t('composerHint', { credits: cost })}
      </p>

      <FieldError message={result?.serverError} />
    </div>
  )
}
