'use client'

import { Check, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'

import { useRouter } from '@/i18n/navigation'
import { selectLogoMark, selectPrimaryLogo } from '@/server/actions/branding'

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

/**
 * Marks a concept as the icon — what gets used where text will not fit.
 *
 * Clicking the current icon clears it, so the favicon falls back to the logo
 * itself rather than needing a separate "none" control.
 */
export function SelectMarkButton({
  projectId,
  fileId,
  isMark,
}: {
  projectId: string
  fileId: string
  isMark: boolean
}) {
  const t = useTranslations('Branding')
  const router = useRouter()

  const { execute, isPending } = useAction(selectLogoMark, {
    onSuccess: () => router.refresh(),
  })

  return (
    <button
      onClick={() => execute({ projectId, fileId: isMark ? null : fileId })}
      disabled={isPending}
      className={
        isMark
          ? 'inline-flex items-center gap-1 text-xs font-medium text-brand disabled:opacity-50'
          : 'text-xs text-fg-secondary transition-colors hover:text-brand disabled:opacity-50'
      }
    >
      {isPending ? (
        <Loader2 className="size-3 animate-spin" />
      ) : isMark ? (
        <>
          <Check className="size-3" />
          {t('isIcon')}
        </>
      ) : (
        t('useAsIcon')
      )}
    </button>
  )
}
