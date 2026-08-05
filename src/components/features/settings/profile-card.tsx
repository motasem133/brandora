'use client'

import { Check, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { useRef, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { ResendVerification } from './resend-verification'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { FieldError } from '@/components/ui/field-error'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
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

      <Field label={t('name')}>
        <Input
          ref={nameRef}
          defaultValue={name}
          onChange={() => setSaved(false)}
          className="mt-1.5"
        />
      </Field>

      {/* The label carried no `htmlFor` and the input no `id`, so this was the
          one field in the product a screen reader announced unnamed. */}
      <Field label={t('email')}>
        <div className="mt-1.5 flex items-center gap-2">
          {/* Changing an email would need re-verification, so it is read-only
              until that flow exists rather than silently doing nothing. */}
          <Input value={email} readOnly disabled />
          <Badge tone={emailVerified ? 'success' : 'warning'}>
            {emailVerified ? t('verified') : t('unverified')}
          </Badge>
        </div>

        {/* The badge stated a problem and offered nothing to do about it. */}
        {!emailVerified && (
          <div className="mt-3">
            <ResendVerification email={email} />
          </div>
        )}
      </Field>

      <Field label={t('language')} hint={t('languageHint')}>
        <Select
          ref={localeRef}
          defaultValue={locale}
          onChange={() => setSaved(false)}
          className="mt-1.5"
        >
          <option value="en">English</option>
          <option value="ar">العربية</option>
        </Select>
      </Field>

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
