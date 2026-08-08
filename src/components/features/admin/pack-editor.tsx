'use client'

import { Loader2 } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { FieldError } from '@/components/ui/field-error'
import { Input } from '@/components/ui/input'
import { updateCreditPack } from '@/server/actions/admin'

export type EditablePack = {
  id: string
  slug: string
  name: string
  credits: number
  price: string
  isActive: boolean
  polarProductId: string | null
}

/** An emptied field means "not sold", which is null rather than "". */
function productId(value: FormDataEntryValue | null) {
  const trimmed = String(value ?? '').trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Connects a credit pack to Polar.
 *
 * Modelled on the plan editor beside it, minus the money: credits and price are
 * seeded, and a price editable at runtime is a price nobody can reconstruct
 * after the fact.
 */
export function PackEditor({ pack }: { pack: EditablePack }) {
  const router = useRouter()
  const { execute, isPending, result } = useAction(updateCreditPack, {
    onSuccess: () => router.refresh(),
  })

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <CardTitle level={3}>{pack.name}</CardTitle>
        <Badge tone={pack.polarProductId ? 'success' : 'warning'}>
          {pack.polarProductId ? 'Sellable' : 'Not connected'}
        </Badge>
      </div>

      <p className="mt-1 text-sm text-fg-secondary">
        {pack.credits} credits · {pack.price}
      </p>

      <form
        className="mt-5 space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          execute({
            packId: pack.id,
            isActive: data.get('isActive') === 'on',
            polarProductId: productId(data.get('polarProductId')),
          })
        }}
      >
        <Field label="Polar product ID" hint="Leave empty to stop selling this pack.">
          <Input
            name="polarProductId"
            defaultValue={pack.polarProductId ?? ''}
            placeholder="00000000-0000-0000-0000-000000000000"
            spellCheck={false}
          />
        </Field>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={pack.isActive} />
          Active
        </label>

        <Button type="submit" size="sm" disabled={isPending}>
          {isPending && <Loader2 className="animate-spin" />}
          Save
        </Button>

        <FieldError message={result?.serverError} />
      </form>
    </Card>
  )
}
