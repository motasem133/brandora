import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { AnalyticsIdentity } from '@/components/analytics/posthog-provider'
import { AppNav } from '@/components/features/dashboard/app-nav'
import { AppSidebar } from '@/components/features/dashboard/app-sidebar'
import { BRAND_COST, brandsFrom } from '@/server/billing/credits'
import { getEntitlements } from '@/server/db/queries/plans'
import { getSession, requireOrg } from '@/server/session'

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  // Middleware already redirected unauthenticated users, but middleware only
  // checks for a cookie's presence. This is the actual enforcement.
  const session = await getSession()
  if (!session) redirect(`/${locale}/login`)

  const { org } = await requireOrg()
  const entitlements = await getEntitlements(org.id)
  const t = await getTranslations('Nav')

  return (
    /*
      The shell of the world that replaced the board: a ground, a rail sitting
      on it, and the content lifted off it as one panel.
    */
    <div className="relative flex min-h-dvh">
      <AnalyticsIdentity
        userId={session.user.id}
        organizationId={org.id}
        plan={entitlements.planName}
      />

      {/*
        One quiet authored light, top left, behind everything.

        This is the world's single source, and the reason it lives here rather
        than on a component is that the alternative is what the board's
        `--accent-surface` note warns about: a gradient repeated per card until
        the accent stops meaning anything. `fixed` rather than absolute so a
        long page scrolls under the light instead of dragging it down the
        document.
      */}
      <div
        aria-hidden
        className="world-glow"
      />

      <AppSidebar
        user={{ name: session.user.name, email: session.user.email }}
        isAdmin={session.user.role === 'admin'}
        credits={org.creditBalance}
        monthlyCredits={entitlements.monthlyCredits}
        brandsLeft={brandsFrom(org.creditBalance, entitlements)}
        brandCost={t('creditsShort', { credits: BRAND_COST })}
        plan={entitlements.planName}
      />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        {/* The same navigation as a bar, below `lg`, where a rail has no room. */}
        <AppNav
          user={{ name: session.user.name, email: session.user.email }}
          isAdmin={session.user.role === 'admin'}
          credits={org.creditBalance}
        />

        {/*
          Content arrives rather than snapping in. Deliberately not keyed on
          the pathname: keying would remount the subtree on every navigation
          and throw away client state the project tabs and assistant rely on.
        */}
        <main
          id="content"
          tabIndex={-1}
          className="animate-fade-up flex-1 lg:min-h-0 lg:p-4 lg:ps-0"
        >
          {/*
            The panel floats; the rail sits on the ground. That is the whole of
            the depth story on this screen, and it is why the rail carries no
            border — a panel that casts a real shadow does not also need a line
            to say where it ends.

            Below `lg` the panel is the page: no margin to float in, no radius
            to round off against the viewport edge, and no shadow to cast.
          */}
          <div className="min-h-full bg-surface px-6 py-8 lg:rounded-panel lg:px-8 lg:py-9 lg:shadow-[var(--shadow-panel)]">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
