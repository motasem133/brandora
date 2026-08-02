import 'server-only'

import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { cache } from 'react'

import { AppError } from '@/lib/errors'
import { auth } from '@/server/auth'
import { db } from '@/server/db'
import { members, organizations } from '@/server/db/schema'
import { resolveActiveOrganization } from '@/server/services/organizations'

/**
 * Session helpers for React Server Components.
 *
 * Wrapped in `cache()` so that a layout and several nested pages resolving the
 * session in the same render pass share one lookup.
 *
 * Middleware redirects are a UX convenience, not a security boundary — pages
 * and actions must call these regardless of what middleware allowed through.
 */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() })
})

export async function requireSession() {
  const session = await getSession()
  if (!session) throw new AppError('UNAUTHORIZED', 'Please sign in to continue.')
  return session
}

export async function requireAdmin() {
  const session = await requireSession()
  if (session.user.role !== 'admin') throw new AppError('FORBIDDEN', 'Admins only.')
  return session
}

/** Resolves the active organization and asserts the caller is a member of it. */
export const requireOrg = cache(async () => {
  const session = await requireSession()

  // Heals a session stamped before its organization existed — see
  // resolveActiveOrganization for why that happens on the first signup.
  const orgId = await resolveActiveOrganization({
    id: session.session.id,
    userId: session.user.id,
    activeOrganizationId: session.session.activeOrganizationId,
  })

  const [row] = await db
    .select({ org: organizations, role: members.role })
    .from(members)
    .innerJoin(organizations, eq(organizations.id, members.organizationId))
    .where(and(eq(members.organizationId, orgId), eq(members.userId, session.user.id)))
    .limit(1)

  if (!row) throw new AppError('FORBIDDEN', 'You are not a member of this organization.')

  return { ...session, org: row.org, orgRole: row.role }
})
