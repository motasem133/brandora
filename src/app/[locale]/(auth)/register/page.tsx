import { getTranslations, setRequestLocale } from 'next-intl/server'

import { RegisterForm } from '@/components/features/auth/register-form'

export default async function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('Auth')

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="font-display text-2xl font-semibold">{t('signUpTitle')}</h1>
        <p className="mt-1.5 text-sm text-fg-secondary">{t('signUpSubtitle')}</p>
      </div>
      <RegisterForm />
    </>
  )
}
