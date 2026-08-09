import { getTranslations, setRequestLocale } from 'next-intl/server'

import { RegisterForm } from '@/components/features/auth/register-form'
import { hasGoogle } from '@/server/auth'
import { redirectIfSignedIn } from '@/server/session'

export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ redirectTo?: string }>
}) {
  const { locale } = await params
  const { redirectTo } = await searchParams
  setRequestLocale(locale)
  await redirectIfSignedIn(locale, redirectTo)
  const t = await getTranslations('Auth')

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="font-display text-2xl font-semibold">{t('signUpTitle')}</h1>
        <p className="mt-1.5 text-sm text-fg-secondary">{t('signUpSubtitle')}</p>
      </div>
      <RegisterForm google={hasGoogle} />
    </>
  )
}
