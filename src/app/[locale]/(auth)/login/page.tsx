import { getTranslations, setRequestLocale } from 'next-intl/server'

import { LoginForm } from '@/components/features/auth/login-form'
import { hasGoogle } from '@/server/auth'
import { redirectIfSignedIn } from '@/server/session'

export default async function LoginPage({
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
        <h1 className="font-display text-2xl font-semibold">{t('signInTitle')}</h1>
        <p className="mt-1.5 text-sm text-fg-secondary">{t('signInSubtitle')}</p>
      </div>
      <LoginForm google={hasGoogle} />
    </>
  )
}
