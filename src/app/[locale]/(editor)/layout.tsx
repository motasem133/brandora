import { setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { AnalyticsIdentity } from '@/components/analytics/posthog-provider'
import { getEntitlements } from '@/server/db/queries/plans'
import { getSession, requireOrg } from '@/server/session'

/**
 * A full-height workspace, outside the dashboard's shell.
 *
 * The builder is 100dvh tall and was rendering inside `(dashboard)`, which puts
 * a 64px navigation bar above it and 40px of padding below: the editor started
 * a hundred pixels down a page that then kept going, so its canvas ran off the
 * bottom of the viewport with no reachable end, and the whole tool sat inset in
 * a dark gutter like a floating card. At 390px roughly a third of the screen
 * was chrome before any of the customer's website appeared.
 *
 * It also carried two navigations. The editor has its own header — back to the
 * brand, undo, redo, device, save state, publish — and `AppNav` above it was a
 * second one competing for the same corner.
 *
 * Everything else the dashboard layout does is kept, because it is not
 * decoration: the session check is the actual enforcement (the proxy only sees
 * whether a cookie exists), and `AnalyticsIdentity` is what ties events to a
 * person and a plan. Losing that silently is the one regression this move could
 * cause.
 */
export default async function EditorLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const session = await getSession()
  if (!session) redirect(`/${locale}/login`)

  const { org } = await requireOrg()
  const { planName } = await getEntitlements(org.id)

  return (
    <>
      <AnalyticsIdentity userId={session.user.id} organizationId={org.id} plan={planName} />
      {children}
    </>
  )
}
