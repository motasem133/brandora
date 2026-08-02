'use client'

import { CheckCircle2, Loader2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { FieldError } from '@/components/ui/field-error'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Link } from '@/i18n/navigation'
import { authClient } from '@/lib/auth-client'

export function ForgotPasswordForm() {
  const t = useTranslations('Auth')
  const tc = useTranslations('Common')

  const locale = useLocale()
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string>()

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(undefined)
    setPending(true)

    const email = String(new FormData(event.currentTarget).get('email'))

    const { error: authError } = await authClient.requestPasswordReset({
      email,
      redirectTo: `/${locale}/reset-password`,
    })

    setPending(false)

    /*
     * Success is reported either way. Telling someone an address is unknown
     * turns this form into a way to discover who has an account.
     */
    if (authError && authError.status !== 400) {
      setError(tc('somethingWentWrong'))
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto size-8 text-success" />
        <p className="text-sm text-fg-secondary">{t('resetSent')}</p>
        <Link href="/login" className="inline-block text-sm text-brand hover:underline">
          {t('backToSignIn')}
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* method="post" so a hydration failure cannot put the address in the URL. */}
      <form method="post" onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">{t('email')}</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required className="mt-1.5" />
        </div>

        <FieldError message={error} />

        <Button type="submit" className="w-full" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {pending ? tc('loading') : t('sendResetLink')}
        </Button>
      </form>

      <p className="text-center text-sm text-fg-secondary">
        <Link href="/login" className="text-brand hover:underline">
          {t('backToSignIn')}
        </Link>
      </p>
    </div>
  )
}
