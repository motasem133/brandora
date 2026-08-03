'use client'

import { Loader2 } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'

import { Button } from '@/components/ui/button'
import { FieldError } from '@/components/ui/field-error'
import type { BillingInterval } from '@/lib/utils'
import { createCheckout } from '@/server/actions/billing'

export function CheckoutButton({
  kind,
  slug,
  label,
  interval = 'monthly',
}: {
  kind: 'plan' | 'pack'
  slug: string
  label: string
  /** Packs are one-off purchases, so they keep the monthly default. */
  interval?: BillingInterval
}) {
  const { execute, isPending, result } = useAction(createCheckout, {
    onSuccess: ({ data }) => {
      // Polar hosts the payment page; leaving the app is the point.
      if (data?.url) window.location.href = data.url
    },
  })

  return (
    <div>
      <Button
        size="sm"
        className="w-full"
        disabled={isPending}
        onClick={() => execute({ kind, slug, interval })}
      >
        {isPending && <Loader2 className="animate-spin" />}
        {label}
      </Button>
      <FieldError message={result?.serverError} />
    </div>
  )
}
