import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppearanceCard } from '@/components/features/settings/appearance-card'
import { OrganizationCard } from '@/components/features/settings/organization-card'
import { PasswordCard } from '@/components/features/settings/password-card'
import { ProfileCard } from '@/components/features/settings/profile-card'
import { requireOrg } from '@/server/session'

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('Settings')
  const { user, org, orgRole } = await requireOrg()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">{t('title')}</h1>
        <p className="mt-1 text-sm text-fg-secondary">{t('subtitle')}</p>
      </div>

      <ProfileCard
        name={user.name}
        email={user.email}
        locale={(user.locale as 'en' | 'ar') ?? 'en'}
        emailVerified={user.emailVerified}
      />

      <PasswordCard />

      <OrganizationCard name={org.name} isOwner={orgRole === 'owner'} credits={org.creditBalance} />

      <AppearanceCard />
    </div>
  )
}
