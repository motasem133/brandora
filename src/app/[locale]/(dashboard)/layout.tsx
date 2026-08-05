import { setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { AnalyticsIdentity } from '@/components/analytics/posthog-provider'
import { MobileNav } from '@/components/features/dashboard/mobile-nav'
import { Sidebar } from '@/components/features/dashboard/sidebar'
import { Topbar } from '@/components/features/dashboard/topbar'
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
  const { planName } = await getEntitlements(org.id)

  return (
    <div className="relative flex min-h-dvh">
      {/*
        The marketing page's horizon used to be drawn across the top of every
        screen in here. It is gone.

        It is the right gesture on a page whose job is to be looked at, and the
        wrong one on a page whose job is to be worked in: it crossed the
        greeting on the overview and the brand's own name on a project page,
        which put a glowing line through the two pieces of text that matter
        most. The app's expression now comes from the work it is showing.
      */}
      <AnalyticsIdentity userId={session.user.id} organizationId={org.id} plan={planName} />
      <Sidebar isAdmin={session.user.role === 'admin'} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={{ name: session.user.name, email: session.user.email }} />
        {/* The rail's destinations, kept reachable where the rail is not. */}
        <MobileNav isAdmin={session.user.role === 'admin'} />
        {/*
          Content arrives rather than snapping in. Deliberately not keyed on
          the pathname: keying would remount the subtree on every navigation
          and throw away client state the project tabs and assistant rely on.
        */}
        <main id="content" tabIndex={-1} className="flex-1 px-6 py-8 animate-fade-up lg:px-10">{children}</main>
      </div>
    </div>
  )
}
