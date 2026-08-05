'use client'

import { Loader2 } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'

import { Button } from '@/components/ui/button'
import { FieldError } from '@/components/ui/field-error'
import { EVENTS, capture } from '@/lib/analytics'
import { createCheckout } from '@/server/actions/billing'

export function CheckoutButton({
  kind,
  slug,
  label,
}: {
  kind: 'plan' | 'pack'
  slug: string
  label: string
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
        onClick={() => {
          capture(EVENTS.checkoutStarted, { kind, slug })
          execute({ kind, slug })
        }}
      >
        {isPending && <Loader2 className="animate-spin" />}
        {label}
      </Button>
      <FieldError message={result?.serverError} />
    </div>
  )
}
