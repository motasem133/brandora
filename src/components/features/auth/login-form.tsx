'use client'

import { Loader2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'

import { GoogleButton } from '@/components/features/auth/google-button'
import { Button } from '@/components/ui/button'
import { FieldError } from '@/components/ui/field-error'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Link, useRouter } from '@/i18n/navigation'
import { authClient } from '@/lib/auth-client'

export function LoginForm() {
  const t = useTranslations('Auth')
  const tc = useTranslations('Common')
  const router = useRouter()
  const locale = useLocale()
  const searchParams = useSearchParams()

  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(undefined)
    setPending(true)

    const data = new FormData(event.currentTarget)

    const { error: authError } = await authClient.signIn.email({
      email: String(data.get('email')),
      password: String(data.get('password')),
    })

    if (authError) {
      // Never distinguish "no such user" from "wrong password" — that is an
      // account-enumeration oracle.
      setError(t('invalidCredentials'))
      setPending(false)
      return
    }

    const redirectTo = searchParams.get('redirectTo')
    // redirectTo comes from the URL, so only same-app relative paths are honoured.
    const safeTarget =
      redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')
        ? redirectTo.replace(new RegExp(`^/${locale}`), '') || '/dashboard'
        : '/dashboard'

    router.push(safeTarget)
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
      <form method="post" onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">{t('email')}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-1.5"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t('password')}</Label>
            <Link href="/forgot-password" className="text-xs accent-text hover:underline">
              {t('forgotPassword')}
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="mt-1.5"
          />
        </div>

        <FieldError message={error} />

        <Button type="submit" className="w-full" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {pending ? tc('loading') : t('signIn')}
        </Button>
      </form>

      <p className="text-center text-sm text-fg-secondary">
        {t('noAccount')}{' '}
        <Link href="/register" className="accent-text hover:underline">
          {t('signUp')}
        </Link>
      </p>
    </div>
  )
}
