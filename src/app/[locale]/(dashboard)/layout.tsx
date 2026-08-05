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
        The light, put back — behind the navigation rather than across the work.

        The marketing page's horizon was drawn over the top of every app screen
        once and removed, correctly: it crossed the greeting on the overview and
        the brand's own name on a project page, which put a glowing line through
        the two pieces of text that matter most. The reference does not light
        its product that way either — its app frame sits in front of the arc,
        and the light inside the frame is in the cards. So this is a single wide
        source behind the header, dying well above the first heading, and the
        panels below carry their own.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(60rem_20rem_at_50%_-6rem,color-mix(in_srgb,var(--brand-primary)_16%,transparent),transparent_70%)]"
      />

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
