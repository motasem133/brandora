'use client'

import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FieldError } from '@/components/ui/field-error'
import { useRouter } from '@/i18n/navigation'
import type { BillingInterval } from '@/lib/utils'
import { changePlan } from '@/server/actions/billing'

/**
 * Moving between plans, without leaving the product.
 *
 * A subscriber used to be sent to Polar's hosted portal, which asked for a
 * payment method they had already given. The card is on file, Polar's API can
 * move the subscription against it, and so this is one confirmation and one
 * request — which is what every other subscription product does, and what
 * anyone reasonably expects.
 *
 * It is deliberately a confirmation rather than a plain button. This charges or
 * credits real money today, at a prorated amount neither the customer nor this
 * component can compute, so the dialog says what is known — the plan and its
 * price — and does not invent a figure for the rest.
 */
export function ChangePlanButton({
  slug,
  planName,
  price,
  interval,
  label,
  canManageCard,
}: {
  slug: string
  planName: string
  price: string
  interval: BillingInterval
  label: string
  /**
   * Whether this organization has a Polar customer behind it.
   *
   * A subscription can exist without one — the customer id is only recorded
   * when a webhook carries it — and the portal has nothing to open without it.
   * The plan change itself is unaffected, because that works from the
   * subscription id, so this hides one link rather than the whole control.
   */
  canManageCard: boolean
}) {
  const t = useTranslations('Billing')
  const tc = useTranslations('Common')
  const router = useRouter()

  const [asking, setAsking] = useState(false)

  const { execute, isPending, result } = useAction(changePlan, {
    onSuccess: () => {
      setAsking(false)
      router.refresh()
    },
    onError: () => setAsking(false),
  })

  return (
    <div>
      <Button size="sm" className="w-full" disabled={isPending} onClick={() => setAsking(true)}>
        {isPending && <Loader2 className="animate-spin" />}
        {label}
      </Button>

      <FieldError message={result?.serverError} />

      <ConfirmDialog
        open={asking}
        pending={isPending}
        onClose={() => setAsking(false)}
        onConfirm={() => execute({ slug, interval })}
        title={t('changeTitle', { plan: planName })}
        body={
          <>
            {t('changeBody', { plan: planName, price })}{' '}
            {/*
              The one question this dialog raises and could not otherwise
              answer: which card. Polar's SDK exposes no payment method on the
              subscription or the customer, so rather than describe a card we
              cannot name, the way to change it sits right here — a plain
              anchor, because /api/portal is a Route Handler that redirects and
              a client navigation would never follow it.
            */}
            {canManageCard && (
              /* eslint-disable-next-line @next/next/no-html-link-for-pages */
              <a href="/api/portal" className="accent-text underline underline-offset-2">
                {t('useAnotherCard')}
              </a>
            )}
          </>
        }
        confirmLabel={t('confirmChange')}
        cancelLabel={tc('cancel')}
      />
    </div>
  )
}
