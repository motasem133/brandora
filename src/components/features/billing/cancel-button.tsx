'use client'

import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'

import { Button } from '@/components/ui/button'
import { useRouter } from '@/i18n/navigation'
import { cancelSubscription } from '@/server/actions/billing'

export function CancelSubscriptionButton() {
  const t = useTranslations('Billing')
  const router = useRouter()

  const { execute, isPending } = useAction(cancelSubscription, {
    onSuccess: () => router.refresh(),
  })

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (confirm(t('cancelConfirm'))) execute({})
      }}
    >
      {isPending && <Loader2 className="animate-spin" />}
      {t('cancel')}
    </Button>
  )
}
