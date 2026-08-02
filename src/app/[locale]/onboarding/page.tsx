import { setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { OnboardingWizard } from '@/components/features/onboarding/wizard'
import { getEntitlements } from '@/server/db/queries/plans'
import { getSession, requireOrg } from '@/server/session'

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const session = await getSession()
  if (!session) redirect(`/${locale}/login`)

  // Entitlements are resolved server-side so the wizard can show what the plan
  // includes rather than accepting a choice the action would silently drop.
  const { org } = await requireOrg()
  const entitlements = await getEntitlements(org.id)

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-12">
      <OnboardingWizard entitlements={entitlements} />
    </div>
  )
}
