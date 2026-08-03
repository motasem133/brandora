'use client'

import { Loader2, Send } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'

import { FieldError } from '@/components/ui/field-error'
import { useRouter } from '@/i18n/navigation'
import { EVENTS, capture } from '@/lib/analytics'
import { regenerateLogos } from '@/server/actions/generation'

/**
 * Say what to change, send, and a new round starts.
 *
 * This replaced a "save direction" button next to a separate "regenerate"
 * button. Typing the direction and then pressing regenerate without saving
 * spent credits on a run that ignored what had just been asked for, and
 * nothing about the two buttons said they had to be pressed in order.
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
       * locally keeps the button showing progress from the moment it is
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
    <div className="rounded-lg border border-line p-4">
      <label htmlFor="logo-direction" className="block text-sm font-medium">
        {t('directionTitle')}
      </label>
      <p className="mt-0.5 text-sm text-fg-secondary">{t('directionHint')}</p>

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
        rows={3}
        maxLength={600}
        placeholder={t('directionPlaceholder')}
        className="mt-3 w-full resize-y rounded-lg border border-line bg-surface px-3.5 py-3 text-sm focus:border-brand focus:outline-none"
      />

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          onClick={send}
          disabled={disabled}
          title={affordable ? undefined : t('notEnoughCredits')}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-brand-fg transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          {busy ? t('regenerating') : t('sendDirection', { credits: cost })}
        </button>

        <span className="text-xs text-fg-muted">{t('keepsPrevious')}</span>
      </div>

      <FieldError message={result?.serverError} />
    </div>
  )
}
