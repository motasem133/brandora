'use client'

import { Check, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'

import { useRouter } from '@/i18n/navigation'
import { selectPrimaryLogo } from '@/server/actions/branding'

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
