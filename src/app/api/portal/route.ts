import { CustomerPortal } from '@polar-sh/nextjs'
import type { NextRequest } from 'next/server'

import { env } from '@/lib/env'
import { getSession, requireOrg } from '@/server/session'

/**
 * Hosted customer portal: invoices, payment methods, cancellation.
 *
 * The customer id is resolved from the caller's own organization rather than
 * accepted as a parameter, so nobody can open someone else's billing portal.
 */
const portal = CustomerPortal({
  accessToken: env.POLAR_ACCESS_TOKEN ?? '',
  server: env.POLAR_SERVER,
  getCustomerId: async () => {
    const { org } = await requireOrg()
    if (!org.polarCustomerId) throw new Error('This organization has no billing account yet.')
    return org.polarCustomerId
  },
})

/**
 * This is a link people follow, so its failures have to look like a page rather
 * than a stack trace.
 *
 * Throwing inside `getCustomerId` answered 500 to two ordinary situations: a
 * signed-out visitor opening the link, and an organization that has never paid
 * and so has no Polar customer to show. Both are answered before the adapter
 * runs, by sending the visitor somewhere they can act — sign-in for the first,
 * the billing page for the second.
 */
export async function GET(request: NextRequest) {
  const locale = request.nextUrl.pathname.startsWith('/ar') ? 'ar' : 'en'
  const session = await getSession()

  if (!session) {
    return Response.redirect(new URL(`/${locale}/login`, env.NEXT_PUBLIC_APP_URL), 307)
  }

  const { org } = await requireOrg()

  if (!org.polarCustomerId) {
    return Response.redirect(new URL(`/${locale}/dashboard/billing`, env.NEXT_PUBLIC_APP_URL), 307)
  }

  return portal(request)
}
