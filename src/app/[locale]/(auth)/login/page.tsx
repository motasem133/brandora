import { getTranslations, setRequestLocale } from 'next-intl/server'

import { LoginForm } from '@/components/features/auth/login-form'
import { hasGoogle } from '@/server/auth'

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
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
