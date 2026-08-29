import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound, redirect } from 'next/navigation'

import { AnalyticsIdentity } from '@/components/analytics/posthog-provider'
import { AppNav } from '@/components/features/dashboard/app-nav'
import { BrandRail } from '@/components/features/projects/brand-rail'
import { RememberBrand } from '@/components/features/projects/remember-brand'
import { CREDIT_COSTS } from '@/server/billing/credits'
import { getBrandRail } from '@/server/db/queries/projects'
import { getEntitlements } from '@/server/db/queries/plans'
import { getSession, requireOrg } from '@/server/session'
import { publicUrl } from '@/server/storage/r2'

/**
 * A brand's own shell, outside the dashboard's.
 *
 * The same move the builder already makes, for the same reason and by the same
 * mechanism: a route group whose layout replaces the app shell rather than
 * nesting inside it. Here what gets replaced is the left rail. On a detail page
 * the question is "what is in this thing", not "where else could I go", and
 * answering the second one costs the whole left column to repeat five
 * destinations the customer just came from.
 *
 * Everything the dashboard layout does that is not decoration is kept, because
 * losing it silently is the one regression this move could cause: the session
 * check is the actual enforcement (the proxy only sees whether a cookie
 * exists), and `AnalyticsIdentity` is what ties events to a person and a plan.
 *
 * **The swap is the rail's, not the header's.** `BrandRail` is `lg` and up,
 * because a 256px column is the thing a phone does not have — so below `lg`
 * this shell rendered no navigation of any kind: no way back to the list, no
 * account, no credits, and no header. The trade above only ever made sense
 * where there is a rail to trade, so `AppNav` stays exactly as it is on every
 * other app surface, and the brand's own sections are reachable below it as
 * the tile wall the page opens with.
 *
 * The rail's data is a small dedicated read rather than the page's whole
 * fan-out. The two cannot share one fetch across the layout boundary without
 * hoisting every asset query up here, and counts over indexed columns are the
 * cheaper half of that trade.
 */
export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  setRequestLocale(locale)

  const session = await getSession()
  if (!session) redirect(`/${locale}/login`)

  const { org } = await requireOrg()
  const entitlements = await getEntitlements(org.id)
  const rail = await getBrandRail(org.id, id)

  /* The page checks this too. Doing it here as well means a stranger's project
     id never renders a rail carrying somebody else's brand name. */
  if (!rail) notFound()

  const t = await getTranslations('Branding')

  const name = rail.project.businessName || rail.project.title
  const logoUrl = rail.logo ? (publicUrl(rail.logo.r2Key) ?? `/api/files/${rail.logo.id}`) : null

  return (
    <div className="relative flex min-h-dvh">
      <AnalyticsIdentity
        userId={session.user.id}
        organizationId={org.id}
        plan={entitlements.planName}
      />

      {/* The world's one authored light, as on every app surface. */}
      <div
        aria-hidden
        className="world-glow"
      />

      {/*
        The sign-in screen has no session to ask, so the last brand this browser
        looked at is the only thing that can tell it whose work to show. Written
        here rather than anywhere else because this is the page where somebody is
        actually looking at a brand.
      */}
      <RememberBrand value={JSON.stringify({ name, palette: rail.palette, logo: logoUrl })} />

      <BrandRail
        projectId={id}
        name={name}
        palette={rail.palette}
        logo={rail.logo}
        counts={rail}
        kitLocked={!entitlements.socialMediaKit && rail.kit === 0}
        kitPrice={t('pinCredits', { credits: CREDIT_COSTS.kit })}
      />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        {/* The app's navigation, below `lg`, where the rail above cannot go. */}
        <AppNav
          user={{ name: session.user.name, email: session.user.email }}
          isAdmin={session.user.role === 'admin'}
          credits={org.creditBalance}
        />

        <main
          id="content"
          tabIndex={-1}
          className="animate-fade-up flex-1 lg:min-h-0 lg:p-4 lg:ps-0"
        >
          <div className="min-h-full bg-surface px-6 py-8 lg:rounded-panel lg:px-8 lg:py-9 lg:shadow-[var(--shadow-panel)]">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
