'use client'

import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useRouter } from '@/i18n/navigation'
import { cancelSubscription } from '@/server/actions/billing'

export function CancelSubscriptionButton() {
  const t = useTranslations('Billing')
  const router = useRouter()

  const [asking, setAsking] = useState(false)

  const { execute, isPending } = useAction(cancelSubscription, {
    onSuccess: () => {
      setAsking(false)
      router.refresh()
    },
    onError: () => setAsking(false),
  })

  return (
    <>
      <Button variant="ghost" size="sm" disabled={isPending} onClick={() => setAsking(true)}>
        {isPending && <Loader2 className="animate-spin" />}
        {t('cancel')}
      </Button>

      {/*
        Cancelling is the most consequential thing anyone does here, and it was
        asking through the browser's own alert — the one dialog in the product
        that carries no theme, no direction and no room to say that access runs
        to the end of the period rather than stopping now.
      */}
      <ConfirmDialog
        open={asking}
        pending={isPending}
        onClose={() => setAsking(false)}
        onConfirm={() => execute({})}
        title={t('cancelTitle')}
        body={t('cancelConfirm')}
        confirmLabel={t('cancel')}
        cancelLabel={t('keepPlan')}
        destructive
      />
    </>
  )
}
