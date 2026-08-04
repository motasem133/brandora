'use client'

import { Check, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { FieldError } from '@/components/ui/field-error'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Link, useRouter } from '@/i18n/navigation'
import { updateOrganizationName } from '@/server/actions/settings'

export function OrganizationCard({
  name,
  isOwner,
  credits,
}: {
  name: string
  isOwner: boolean
  credits: number
}) {
  const t = useTranslations('Settings')
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [saved, setSaved] = useState(false)

  const { execute, isPending, result } = useAction(updateOrganizationName, {
    onSuccess: () => {
      setSaved(true)
      router.refresh()
    },
  })

  return (
    <Card className="space-y-4">
      <CardTitle>{t('organization')}</CardTitle>

      <div>
        <Label htmlFor="orgName">{t('workspaceName')}</Label>
        <Input
          id="orgName"
          ref={inputRef}
          defaultValue={name}
          disabled={!isOwner}
          onChange={() => setSaved(false)}
          className="mt-1.5"
        />
        {!isOwner && <p className="mt-1 text-xs text-fg-muted">{t('ownerOnly')}</p>}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-line px-4 py-3">
        <div>
          <p className="text-sm">{t('credits')}</p>
          <p className="font-display text-lg font-semibold">{credits}</p>
        </div>
        <Link href="/dashboard/billing" className="text-sm accent-text hover:underline">
          {t('manageBilling')}
        </Link>
      </div>

      {/* Seats are sold on paid plans but there is no invite flow yet, so this
          says so rather than offering a control that does nothing. */}
      <CardDescription>{t('teamComingSoon')}</CardDescription>

      {isOwner && (
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="secondary"
            disabled={isPending}
            onClick={() => execute({ name: inputRef.current?.value ?? name })}
          >
            {isPending && <Loader2 className="animate-spin" />}
            {t('save')}
          </Button>
          {saved && !isPending && (
            <span className="inline-flex items-center gap-1 text-xs text-success">
              <Check className="size-3.5" />
              {t('saved')}
            </span>
          )}
        </div>
      )}

      <FieldError message={result?.serverError} />
    </Card>
  )
}
