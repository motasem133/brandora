import { getTranslations, setRequestLocale } from 'next-intl/server'

import { ResetPasswordForm } from '@/components/features/auth/reset-password-form'

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ token?: string; error?: string }>
}) {
  const { locale } = await params
  const { token, error } = await searchParams
  setRequestLocale(locale)
  const t = await getTranslations('Auth')

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="type-plate-sm">{t('resetTitle')}</h1>
        <p className="mt-1.5 text-sm text-fg-secondary">{t('resetSubtitle')}</p>
      </div>
      <ResetPasswordForm token={token ?? null} linkError={error ?? null} />
    </>
  )
}
