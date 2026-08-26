import { getTranslations, setRequestLocale } from 'next-intl/server'

import { AppearanceCard } from '@/components/features/settings/appearance-card'
import { OrganizationCard } from '@/components/features/settings/organization-card'
import { PasswordCard } from '@/components/features/settings/password-card'
import { ProfileCard } from '@/components/features/settings/profile-card'
import { TeamCard } from '@/components/features/settings/team-card'
import { listMembers, listPendingInvitations } from '@/server/db/queries/members'
import { getEntitlements } from '@/server/db/queries/plans'
import { requireOrg } from '@/server/session'

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('Settings')
  const { user, org, orgRole } = await requireOrg()

  const [members, pending, entitlements] = await Promise.all([
    listMembers(org.id),
    listPendingInvitations(org.id),
    getEntitlements(org.id),
  ])

  /*
   * Two columns of settings, grouped by what they belong to.
   *
   * This was one 640px column holding four full-width cards, which on a laptop
   * put every control in the left third of the screen and left the other two
   * thirds empty — and made the fourth card, a single button, as tall a
   * commitment as the one holding the whole profile form. Grouping them says
   * something as well as saving the space: the left column is the person, the
   * right is the workspace they are working in.
   *
   * `items-start` matters here. Grid children stretch by default, so the
   * appearance card would grow to whatever height the workspace card next to it
   * happened to be.
   */
  /*
   * The rest of the desk. Settings is administration — a name, a password, a
   * theme, an organisation, seats — and none of it is generated, so it takes
   * the board on the same terms billing did.
   *
   * The negative margins cancel the shell's padding so the board reaches the
   * edges of the column rather than floating as a panel inside the old ground.
   */
  return (
    <div className="world-board -mx-6 -my-10 min-h-screen px-6 py-10 lg:-mx-10 lg:px-10">
      <div className="mx-auto max-w-5xl">
      <div>
        <h1 className="font-display text-2xl font-semibold">{t('title')}</h1>
        <p className="mt-1 text-sm text-fg-secondary">{t('subtitle')}</p>
      </div>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <ProfileCard
            name={user.name}
            email={user.email}
            locale={(user.locale as 'en' | 'ar') ?? 'en'}
            emailVerified={user.emailVerified}
          />

          <PasswordCard />
        </div>

        <div className="space-y-6">
          <OrganizationCard
            name={org.name}
            isOwner={orgRole === 'owner'}
            credits={org.creditBalance}
          />

          <AppearanceCard />
        </div>
      </div>

      {/*
        Full width under the two columns rather than a route of its own. A new
        page would need a nav entry to be findable, and `e2e/links.spec.ts`
        crawls every link on this page — a card carries neither risk.
      */}
      <div className="mt-6">
        <TeamCard
          members={members}
          pending={pending}
          seats={entitlements.seats}
          canManage={orgRole === 'owner' || orgRole === 'admin'}
          currentUserId={user.id}
        />
      </div>
    </div>
    </div>
  )
}
