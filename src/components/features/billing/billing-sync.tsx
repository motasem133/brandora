'use client'

import { Loader2, RefreshCw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { useEffect, useRef } from 'react'

import { Button } from '@/components/ui/button'
import { EVENTS, capture } from '@/lib/analytics'
import { useRouter } from '@/i18n/navigation'
import { syncBilling } from '@/server/actions/billing'

export function BillingSync({ auto }: { auto: boolean }) {
  const t = useTranslations('Billing')
  const router = useRouter()
  const started = useRef(false)

  const { execute, isPending } = useAction(syncBilling, {
    onSuccess: () => router.refresh(),
  })

  /*
   * Returning from checkout means Polar has just recorded a payment, but the
   * webhook may not have landed yet — and in local development cannot. Pulling
   * once on arrival closes that window. The ref guards against React's
   * development double-invoke firing two syncs.
   */
  useEffect(() => {
    if (!auto || started.current) return
    started.current = true
    /*
     * The other end of `checkout_started`. Polar's own success URL is what puts
     * `auto` on, so this fires once per completed payment and nowhere else.
     *
     * It undercounts by whoever pays and closes the tab before being sent back.
     * The webhook is the only place that cannot miss them, and reaching it from
     * the server needs an HTTP capture this app does not have yet — worth
     * adding when the gap between this number and Polar's is large enough to
     * argue about.
     */
    capture(EVENTS.checkoutCompleted)
    execute({})
  }, [auto, execute])

  return (
    <Button variant="ghost" size="sm" disabled={isPending} onClick={() => execute({})}>
      {isPending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
      {t('refresh')}
    </Button>
  )
}
