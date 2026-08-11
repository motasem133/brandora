'use client'

import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { FieldError } from '@/components/ui/field-error'
import { Input } from '@/components/ui/input'
import { useRouter } from '@/i18n/navigation'
import { adjustCredits } from '@/server/actions/admin'

/**
 * Moving credits by hand, from a screen instead of from psql.
 *
 * `adjustCredits` has existed since the ledger did — audited, idempotent,
 * correct — and was wired to nothing, so the only way to run it was a
 * statement typed against production. Two grants have been made that way. A
 * hand-written write to a money table is fine until the afternoon it is not,
 * and this is the same action with a form in front of it.
 *
 * A note is required rather than optional. The ledger's own argument is that a
 * movement nobody can explain is worse than no movement: the row already
 * records who and how much, and the only thing it cannot recover later is why.
 */
export function CreditGrant({
  organizationId,
  organizationName,
  balance,
}: {
  organizationId: string
  organizationName: string
  balance: number
}) {
  const t = useTranslations('Admin.credits')
  const tc = useTranslations('Common')
  const router = useRouter()

  const [open, setOpen] = React.useState(false)
  const [amount, setAmount] = React.useState('')
  const [note, setNote] = React.useState('')
  const [problem, setProblem] = React.useState<string>()

  const { executeAsync, isPending } = useAction(adjustCredits)

  const parsed = Number(amount)
  const valid = Number.isInteger(parsed) && parsed !== 0 && note.trim().length > 0

  async function submit() {
    setProblem(undefined)

    /*
     * Confirmed in the browser rather than only in the action.
     *
     * This is the one control in the product that moves somebody else's money
     * on a single press, and the number is typed. A misplaced minus sign is
     * the mistake worth one extra beat.
     */
    const direction = parsed > 0 ? t('confirmGrant') : t('confirmRemove')
    if (!window.confirm(t('confirm', { direction, amount: Math.abs(parsed), name: organizationName }))) {
      return
    }

    const outcome = await executeAsync({
      organizationId,
      amount: parsed,
      note: note.trim(),
    })

    if (outcome?.serverError) {
      setProblem(outcome.serverError)
      return
    }

    setAmount('')
    setNote('')
    setOpen(false)
    router.refresh()
  }

  if (!open) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        {t('adjust')}
      </Button>
    )
  }

  return (
    <div className="flex flex-wrap items-start gap-2">
      <div>
        <Input
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          inputMode="numeric"
          placeholder={t('amountPlaceholder')}
          aria-label={t('amount')}
          className="w-28"
          autoFocus
        />
        {/* What the balance becomes, before it becomes it. */}
        {Number.isInteger(parsed) && parsed !== 0 && (
          <p className="mt-1 text-xs text-fg-muted">{t('after', { balance: balance + parsed })}</p>
        )}
      </div>

      <Input
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={200}
        placeholder={t('notePlaceholder')}
        aria-label={t('note')}
        className="w-56"
      />

      <Button size="sm" onClick={submit} disabled={!valid || isPending}>
        {isPending && <Loader2 className="size-3.5 animate-spin" />}
        {tc('save')}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
        {tc('cancel')}
      </Button>

      <FieldError message={problem} />
    </div>
  )
}
