import { setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { OnboardingWizard } from '@/components/features/onboarding/wizard'
import { getSession } from '@/server/session'

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const session = await getSession()
  if (!session) redirect(`/${locale}/login`)

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-12">
      <OnboardingWizard />
    </div>
  )
}
