'use client'

import { Check, Loader2, RefreshCw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'

import { FieldError } from '@/components/ui/field-error'
import { useRouter } from '@/i18n/navigation'
import { EVENTS, capture } from '@/lib/analytics'
import { selectPrimaryLogo } from '@/server/actions/branding'
import { regenerateLogos } from '@/server/actions/generation'

export function SelectLogoButton({
  projectId,
  fileId,
  isPrimary,
}: {
  projectId: string
  fileId: string
  isPrimary: boolean
}) {
  const t = useTranslations('Branding')
  const router = useRouter()

  const { execute, isPending } = useAction(selectPrimaryLogo, {
    onSuccess: () => router.refresh(),
  })

  if (isPrimary) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-brand">
        <Check className="size-3" />
        {t('chosen')}
      </span>
    )
  }

  return (
    <button
      onClick={() => execute({ projectId, fileId })}
      disabled={isPending}
      className="text-xs text-fg-secondary transition-colors hover:text-brand disabled:opacity-50"
    >
      {isPending ? <Loader2 className="size-3 animate-spin" /> : t('useThisLogo')}
    </button>
  )
}

export function RegenerateLogosButton({
  projectId,
  cost,
  affordable,
  isRunning,
}: {
  projectId: string
  cost: number
  affordable: boolean
  isRunning: boolean
}) {
  const t = useTranslations('Branding')
  const router = useRouter()
  const [queued, setQueued] = useState(false)

  const { execute, isPending, result } = useAction(regenerateLogos, {
    onSuccess: () => {
      /*
       * Queueing returns immediately, long before anything visible changes.
       * Holding a local state keeps the button showing progress from the click
       * onwards rather than appearing to do nothing until the refresh lands —
       * which is what made people click it twice.
       */
      capture(EVENTS.logosRegenerated, { cost })
      setQueued(true)
      router.refresh()
    },
    onError: () => setQueued(false),
  })

  const busy = isPending || queued || isRunning

  return (
    <div>
      <button
        onClick={() => execute({ projectId })}
        disabled={busy || !affordable}
        className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm transition-colors hover:border-brand disabled:opacity-60"
        title={affordable ? undefined : t('notEnoughCredits')}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        {busy ? t('regenerating') : t('regenerateLogos', { credits: cost })}
      </button>
      <FieldError message={result?.serverError} />
    </div>
  )
}
