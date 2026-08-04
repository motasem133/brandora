'use client'

import { Check, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'

import { Button } from '@/components/ui/button'
import { useRouter } from '@/i18n/navigation'
import { selectPrimaryLogo } from '@/server/actions/branding'

/**
 * The decision the whole branding screen exists to support.
 *
 * These were 12px text links under a thumbnail — the most consequential control
 * on the page rendered as the least prominent thing on it. On the canvas they
 * are buttons, and the chosen state is a disabled button rather than a
 * disappearing one, so the row never changes shape under the pointer.
 */
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
      <Button variant="secondary" size="sm" disabled className="disabled:opacity-100">
        <Check className="text-brand" />
        {t('chosen')}
      </Button>
    )
  }

  return (
    <Button size="sm" disabled={isPending} onClick={() => execute({ projectId, fileId })}>
      {isPending && <Loader2 className="animate-spin" />}
      {t('useThisLogo')}
    </Button>
  )
}

/**
 * Marks a concept as the icon — what gets used where text will not fit.
 *
 * Clicking the current icon clears it, so the favicon falls back to the logo
 * itself rather than needing a separate "none" control.
 */
