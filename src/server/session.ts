import 'server-only'

import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
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

/**
 * Sends a genuinely signed-in visitor away from a page meant for guests.
 *
 * The proxy used to do this from the presence of the cookie, which is a guess,
 * and the guess and the truth could disagree — at which point the two halves
 * bounced the visitor between them forever. Delete the account (or the session
 * row, or restore an older database) while a browser still holds the cookie
 * and: /dashboard finds no session and redirects to /login, /login sees a
 * cookie and redirects to /dashboard, and the tab is bricked with nothing but
 * 307s. The only exit was clearing cookies by hand, which is not a thing to
 * expect of anyone.
 *
 * So the question is asked of the database on the three pages that care. It
 * costs a session lookup on pages that are, by definition, mostly reached by
 * people who do not have one.
 */
export async function redirectIfSignedIn(locale: string, redirectTo?: string) {
  const session = await getSession()
  if (!session) return

  /*
   * Honour where they were going — an invited person who is already signed in
   * clicks the invitation, lands on /register, and must still reach it. Same
   * rule as the sign-in form: relative paths within this app only, so the
   * parameter cannot become an open redirect.
   */
  const safe = redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')
  redirect(safe ? redirectTo : `/${locale}/dashboard`)
}

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
