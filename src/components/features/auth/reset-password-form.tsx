'use client'

import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { FieldError } from '@/components/ui/field-error'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Link, useRouter } from '@/i18n/navigation'
import { authClient } from '@/lib/auth-client'

export function ResetPasswordForm({
  token,
  linkError,
}: {
  token: string | null
  linkError: string | null
}) {
  const t = useTranslations('Auth')
  const tc = useTranslations('Common')
  const router = useRouter()

  const [pending, setPending] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Better Auth redirects here with ?error=INVALID_TOKEN when a link has
  // expired or already been used, so say that rather than showing a form that
  // cannot succeed.
  if (!token || linkError) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-danger">{t('resetLinkInvalid')}</p>
        <Link href="/forgot-password" className="inline-block text-sm accent-text hover:underline">
          {t('requestNewLink')}
        </Link>
      </div>
    )
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrors({})

    const data = new FormData(event.currentTarget)
    const password = String(data.get('password'))
    const confirm = String(data.get('confirmPassword'))

    const next: Record<string, string> = {}
    if (password.length < 8) next.password = t('passwordTooShort')
    if (password !== confirm) next.confirmPassword = t('passwordMismatch')

    if (Object.keys(next).length > 0) {
      setErrors(next)
      return
    }

    setPending(true)
    const { error } = await authClient.resetPassword({ newPassword: password, token: token! })

    if (error) {
      setErrors({ form: t('resetLinkInvalid') })
      setPending(false)
      return
    }

    router.push('/login?reset=1')
  }

  return (
    <form method="post" onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <Label htmlFor="password">{t('newPassword')}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password)}
          className="mt-1.5"
        />
        <FieldError message={errors.password} />
      </div>

      <div>
        <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.confirmPassword)}
          className="mt-1.5"
        />
        <FieldError message={errors.confirmPassword} />
      </div>

      <FieldError message={errors.form} />

      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        {pending ? tc('saving') : t('setNewPassword')}
      </Button>
    </form>
  )
}
