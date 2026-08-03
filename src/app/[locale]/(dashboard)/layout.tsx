import { setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { AnalyticsIdentity } from '@/components/analytics/posthog-provider'
import { SectionArc } from '@/components/features/landing/horizon'
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
        The same light as the marketing page, once, at the top of the app.
        Behind the content and behind the sidebar, so the whole shell sits
        under one sky rather than each screen inventing its own.
      */}
      <SectionArc className="top-0 opacity-70" />
      <AnalyticsIdentity userId={session.user.id} organizationId={org.id} plan={planName} />
      <Sidebar isAdmin={session.user.role === 'admin'} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={{ name: session.user.name, email: session.user.email }} />
        {/*
          Content arrives rather than snapping in. Deliberately not keyed on
          the pathname: keying would remount the subtree on every navigation
          and throw away client state the project tabs and assistant rely on.
        */}
        <main className="flex-1 px-6 py-8 animate-fade-up lg:px-10">{children}</main>
      </div>
    </div>
  )
}
