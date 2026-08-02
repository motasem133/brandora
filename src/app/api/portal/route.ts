import { CustomerPortal } from '@polar-sh/nextjs'

import { env } from '@/lib/env'
import { requireOrg } from '@/server/session'

/**
 * Hosted customer portal: invoices, payment methods, cancellation.
 *
 * The customer id is resolved from the caller's own organization rather than
 * accepted as a parameter, so nobody can open someone else's billing portal.
 */
export const GET = CustomerPortal({
  accessToken: env.POLAR_ACCESS_TOKEN ?? '',
  server: env.POLAR_SERVER,
  getCustomerId: async () => {
    const { org } = await requireOrg()
    if (!org.polarCustomerId) throw new Error('This organization has no billing account yet.')
    return org.polarCustomerId
  },
})
