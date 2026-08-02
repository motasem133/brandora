'use client'

import { Check, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { useRef, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { FieldError } from '@/components/ui/field-error'
import { useRouter } from '@/i18n/navigation'
import { updatePlan } from '@/server/actions/admin'

type Plan = {
  id: string
  name: string
  price: string
  monthlyCredits: number
  isActive: boolean
  websiteBuilder: boolean
  socialMediaKit: boolean
  vectorExport: boolean
  brandAssistant: boolean
  customDomain: boolean
  connected: boolean
}

const FLAGS = [
  'websiteBuilder',
  'socialMediaKit',
  'vectorExport',
  'brandAssistant',
  'customDomain',
] as const

export function PlanEditor({ plan }: { plan: Plan }) {
  const t = useTranslations('Admin')
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [saved, setSaved] = useState(false)

  const { execute, isPending, result } = useAction(updatePlan, {
    onSuccess: () => {
      setSaved(true)
      router.refresh()
    },
  })

  function save() {
    const form = formRef.current
    if (!form) return
    const data = new FormData(form)

    execute({
      planId: plan.id,
      monthlyCredits: Number(data.get('monthlyCredits') ?? plan.monthlyCredits),
      isActive: data.get('isActive') === 'on',
      websiteBuilder: data.get('websiteBuilder') === 'on',
      socialMediaKit: data.get('socialMediaKit') === 'on',
      vectorExport: data.get('vectorExport') === 'on',
      brandAssistant: data.get('brandAssistant') === 'on',
      customDomain: data.get('customDomain') === 'on',
    })
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <CardTitle>{plan.name}</CardTitle>
          <p className="mt-0.5 text-sm text-fg-secondary">{plan.price}</p>
        </div>
        {/* Without a Polar product, checkout cannot resolve anything to sell. */}
        <Badge tone={plan.connected ? 'success' : 'warning'}>
          {plan.connected ? t('plans.connected') : t('plans.notConnected')}
        </Badge>
      </div>

      <form ref={formRef} className="space-y-3" onChange={() => setSaved(false)}>
        <label className="block">
          <span className="mb-1 block text-xs text-fg-secondary">{t('plans.monthlyCredits')}</span>
          <input
            name="monthlyCredits"
            type="number"
            min={0}
            defaultValue={plan.monthlyCredits}
            className="h-10 w-32 rounded-lg border border-line bg-surface px-3 text-sm focus:border-brand focus:outline-none"
          />
        </label>

        <div className="grid gap-2 sm:grid-cols-2">
          {FLAGS.map((flag) => (
            <label key={flag} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name={flag} defaultChecked={plan[flag]} className="size-4" />
              {t(`plans.flags.${flag}`)}
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked={plan.isActive} className="size-4" />
            {t('plans.active')}
          </label>
        </div>
      </form>

      <div className="flex items-center gap-3">
        <Button size="sm" variant="secondary" disabled={isPending} onClick={save}>
          {isPending && <Loader2 className="animate-spin" />}
          {t('plans.save')}
        </Button>
        {saved && !isPending && (
          <span className="inline-flex items-center gap-1 text-xs text-success">
            <Check className="size-3.5" />
            {t('plans.saved')}
          </span>
        )}
      </div>

      <FieldError message={result?.serverError} />
    </Card>
  )
}
