'use client'

import { Loader2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'

import { GoogleButton } from '@/components/features/auth/google-button'
import { Button } from '@/components/ui/button'
import { FieldError } from '@/components/ui/field-error'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Link, useRouter } from '@/i18n/navigation'
import { authClient } from '@/lib/auth-client'

export function RegisterForm() {
  const t = useTranslations('Auth')
  const tc = useTranslations('Common')
  const router = useRouter()
  const locale = useLocale()

  const [pending, setPending] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrors({})

    const data = new FormData(event.currentTarget)
    const name = String(data.get('name')).trim()
    const email = String(data.get('email')).trim()
    const password = String(data.get('password'))
    const confirm = String(data.get('confirmPassword'))

    const next: Record<string, string> = {}
    if (!name) next.name = t('nameRequired')
    if (password.length < 8) next.password = t('passwordTooShort')
    if (password !== confirm) next.confirmPassword = t('passwordMismatch')

    if (Object.keys(next).length > 0) {
      setErrors(next)
      return
    }

    setPending(true)

    const { error } = await authClient.signUp.email({
      name,
      email,
      password,
      // `locale` is an additionalField; role/status are input:false and cannot
      // be set from here by design.
      locale,
    } as Parameters<typeof authClient.signUp.email>[0])

    if (error) {
      setErrors({
        form: error.status === 422 ? t('emailTaken') : tc('somethingWentWrong'),
      })
      setPending(false)
      return
    }

    router.push('/onboarding')
    router.refresh()
  }

  return (
    <div className="space-y-5">
      <GoogleButton label={t('continueWithGoogle')} />

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-line" />
        <span className="text-xs text-fg-muted">{t('orContinueWith')}</span>
        <div className="h-px flex-1 bg-line" />
      </div>

      {/*
        method="post" is defensive. If hydration fails, the browser falls back to
        submitting the form natively, and the default GET would put the password
        in the URL and the browser history.
      */}
      <form method="post" onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="name">{t('name')}</Label>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            className="mt-1.5"
          />
          <FieldError message={errors.name} />
        </div>

        <div>
          <Label htmlFor="email">{t('email')}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={Boolean(errors.email)}
            className="mt-1.5"
          />
          <FieldError message={errors.email} />
        </div>

        <div>
          <Label htmlFor="password">{t('password')}</Label>
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
          {pending ? tc('loading') : t('signUp')}
        </Button>
      </form>

      <p className="text-center text-sm text-fg-secondary">
        {t('haveAccount')}{' '}
        <Link href="/login" className="accent-text hover:underline">
          {t('signIn')}
        </Link>
      </p>
    </div>
  )
}
