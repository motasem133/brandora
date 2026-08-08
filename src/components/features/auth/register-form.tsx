'use client'

import { Loader2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'

import { GoogleButton } from '@/components/features/auth/google-button'
import { Button } from '@/components/ui/button'
import { FieldError } from '@/components/ui/field-error'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Link, useRouter } from '@/i18n/navigation'
import { authClient } from '@/lib/auth-client'

/** `google` is false wherever the provider has no credentials behind it. */
export function RegisterForm({ google }: { google: boolean }) {
  const t = useTranslations('Auth')
  const tc = useTranslations('Common')
  const router = useRouter()
  const locale = useLocale()
  const searchParams = useSearchParams()

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

    /*
     * Onboarding unless they were sent here from somewhere. Someone who
     * followed an invitation is signing up *to join a workspace*, and dropping
     * them into the brand wizard loses the invitation they came for.
     *
     * Same relative-path-only guard the sign-in form uses.
     */
    const redirectTo = searchParams.get('redirectTo')
    const safeTarget =
      redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')
        ? redirectTo.replace(new RegExp(`^/${locale}`), '') || '/onboarding'
        : '/onboarding'

    router.push(safeTarget)
    router.refresh()
  }

  return (
    <div className="space-y-5">
      {/*
        Offered only where it can work.

        The provider is configured server-side and `socialProviders` is empty
        without its keys, but this button was rendered either way — so on a
        deployment with no Google credentials it was a control that took a press
        and failed. The rest of the product already follows this rule: the
        builder hides the custom-domain section rather than offering a control
        that cannot work.

        The divider goes with it. A rule captioned "or continue with email"
        above the only way to continue is a caption for a choice nobody has.
      */}
      {google && (
        <>
          <GoogleButton label={t('continueWithGoogle')} />

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-line" />
            <span className="text-xs text-fg-muted">{t('orContinueWith')}</span>
            <div className="h-px flex-1 bg-line" />
          </div>
        </>
      )}

      {/*
        method="post" is defensive. If hydration fails, the browser falls back to
        submitting the form natively, and the default GET would put the password
        in the URL and the browser history.
      */}
      <form method="post" onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label={t('name')} error={errors.name}>
          <Input name="name" autoComplete="name" className="mt-1.5" />
        </Field>

        <Field label={t('email')} error={errors.email} required>
          <Input name="email" type="email" autoComplete="email" required className="mt-1.5" />
        </Field>

        {/* The rule is stated before the field is used, not after it is
            refused — it was only discoverable by submitting and failing. */}
        <Field label={t('password')} error={errors.password} hint={t('passwordHint')} required>
          <Input name="password" type="password" autoComplete="new-password" className="mt-1.5" />
        </Field>

        <Field label={t('confirmPassword')} error={errors.confirmPassword} required>
          <Input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            className="mt-1.5"
          />
        </Field>

        {/* The form-level failure — a rejected sign-up, a taken email —
            announces itself through FieldError's alert role. */}
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
