import { setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { AnalyticsIdentity } from '@/components/analytics/posthog-provider'
import { AppNav } from '@/components/features/dashboard/app-nav'
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
    <div className="relative flex min-h-dvh flex-col">
      <AnalyticsIdentity userId={session.user.id} organizationId={org.id} plan={planName} />

      {/*
        The whole dashboard is on the board.

        Scoping the layout rather than each page is what removes the seam: the
        shell, the wall surfaces and the desk surfaces are one world again, and
        billing and settings no longer need a wrapper of their own to reach the
        edges of the column.

        The radial wash that used to sit behind the header is gone. It drew the
        Darkroom's horizon — a single wide source below the fold, rising — and
        the board has no horizon. What lifted a panel there is what lifts a sheet
        here: its own shadow.
      */}

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
        className="animate-fade-up mx-auto w-full max-w-[90rem] flex-1 px-6 py-10 lg:px-10"
      >
        {children}
      </main>
    </div>
  )
}
