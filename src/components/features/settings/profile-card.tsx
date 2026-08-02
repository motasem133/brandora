'use client'

import { Check, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { useRef, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { FieldError } from '@/components/ui/field-error'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from '@/i18n/navigation'
import { updateProfile } from '@/server/actions/settings'

export function ProfileCard({
  name,
  email,
  locale,
  emailVerified,
}: {
  name: string
  email: string
  locale: 'en' | 'ar'
  emailVerified: boolean
}) {
  const t = useTranslations('Settings')
  const router = useRouter()
  const nameRef = useRef<HTMLInputElement>(null)
  const localeRef = useRef<HTMLSelectElement>(null)
  const [saved, setSaved] = useState(false)

  const { execute, isPending, result } = useAction(updateProfile, {
    onSuccess: () => {
      setSaved(true)
      router.refresh()
    },
  })

  return (
    <Card className="space-y-4">
      <CardTitle>{t('profile')}</CardTitle>

      <div>
        <Label htmlFor="name">{t('name')}</Label>
        <Input
          id="name"
          ref={nameRef}
          defaultValue={name}
          onChange={() => setSaved(false)}
          className="mt-1.5"
        />
      </div>

      <div>
        <Label>{t('email')}</Label>
        <div className="mt-1.5 flex items-center gap-2">
          {/* Changing an email would need re-verification, so it is read-only
              until that flow exists rather than silently doing nothing. */}
          <Input value={email} readOnly disabled />
          <Badge tone={emailVerified ? 'success' : 'warning'}>
            {emailVerified ? t('verified') : t('unverified')}
          </Badge>
        </div>
      </div>

      <div>
        <Label htmlFor="locale">{t('language')}</Label>
        <select
          id="locale"
          ref={localeRef}
          defaultValue={locale}
          onChange={() => setSaved(false)}
          className="mt-1.5 h-11 w-full rounded-lg border border-line bg-surface px-3.5 text-sm focus:border-brand focus:outline-none"
        >
          <option value="en">English</option>
          <option value="ar">العربية</option>
        </select>
        <p className="mt-1 text-xs text-fg-muted">{t('languageHint')}</p>
      </div>

      <div className="flex items-center gap-3">
        <Button
          size="sm"
          variant="secondary"
          disabled={isPending}
          onClick={() =>
            execute({
              name: nameRef.current?.value ?? name,
              locale: (localeRef.current?.value as 'en' | 'ar') ?? locale,
            })
          }
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

      <FieldError message={result?.serverError} />
    </Card>
  )
}
