import { desc, eq } from 'drizzle-orm'
import { setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { OnboardingWizard } from '@/components/features/onboarding/wizard'
import { SectionArc } from '@/components/ui/horizon'
import { CREDIT_COSTS, mustVerifyEmail } from '@/server/billing/credits'
import { db } from '@/server/db'
import { getEntitlements } from '@/server/db/queries/plans'
import { projects } from '@/server/db/schema'
import { isLogoGenerationAvailable } from '@/server/services/generation'
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

  /*
   * The first run is not gated on a confirmed address, and this page is where
   * almost every first run happens — a new account lands here straight from
   * sign-up. So the wizard is told whether this account has already had it,
   * not whether the address is confirmed.
   */
  const mustVerify = await mustVerifyEmail(org.id, session.user.emailVerified)

  /*
   * The wizard starts the run now, so it has to be able to price it before
   * asking — and the price is not a constant: logos are the expensive section
   * and they are only generated where this deployment has the keys to render
   * them. A figure computed on the client would be a guess.
   */
  const pricing = {
    base: CREDIT_COSTS.branding + (isLogoGenerationAvailable() ? CREDIT_COSTS.logos : 0),
    website: CREDIT_COSTS.website,
    social: CREDIT_COSTS.social,
  }

  /*
   * What the last brand answered, for the account this product is actually
   * built around: the freelancer producing identity after identity, who has
   * been retyping the same country and industry every run.
   *
   * Only the answers that stay true between clients carry over. The brief and
   * the name are what make each brand a different brand, so they always start
   * empty.
   */
  const [previous] = await db
    .select({
      name: projects.businessName,
      title: projects.title,
      industry: projects.industry,
      country: projects.country,
      brandStyle: projects.brandStyle,
    })
    .from(projects)
    .where(eq(projects.organizationId, org.id))
    .orderBy(desc(projects.createdAt))
    .limit(1)

  return (
    <main
      id="content"
      tabIndex={-1}
      /*
       * The run's own room. This route has no navigation and no sidebar by
       * design — eight questions, one at a time — so it is the one app surface
       * that can carry the light the way the marketing pages do without it
       * crossing anything. The arc rises behind the panel, from below.
       */
      className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-12"
    >
      <SectionArc className="bottom-0 top-auto translate-y-1/3" />
      <OnboardingWizard
        entitlements={entitlements}
        pricing={pricing}
        balance={org.creditBalance}
        mustVerify={mustVerify}
        userEmail={session.user.email}
        carriedOver={
          previous
            ? {
                from: previous.name || previous.title,
                industry: previous.industry,
                country: previous.country,
                brandStyle: previous.brandStyle,
              }
            : null
        }
      />
    </main>
  )
}
