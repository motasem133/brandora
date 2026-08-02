import 'server-only'

import { asc, eq } from 'drizzle-orm'

import { writeLedgerEntry } from '@/server/billing/credits'
import { db } from '@/server/db'
import { members, organizations, sessions, users } from '@/server/db/schema'

/** Free plan grant, applied when a personal organization is created. */
export const FREE_STARTING_CREDITS = 10

function slugify(input: string) {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32) || 'workspace'
  )
}

/**
 * Every user needs a personal organization: the entire authorization model is
 * org-scoped, so a user without one cannot reach their own dashboard.
 */
export async function createPersonalOrganization(user: {
  id: string
  name: string
  email: string
}) {
  const base = slugify(user.name || user.email.split('@')[0])
  // Short random suffix keeps the unique slug constraint from colliding on
  // common names without needing a retry loop.
  const slug = `${base}-${crypto.randomUUID().slice(0, 6)}`

  const [org] = await db
    .insert(organizations)
    .values({
      id: crypto.randomUUID(),
      name: user.name ? `${user.name}'s workspace` : 'My workspace',
      slug,
      // Starts at zero: the grant below is what moves it, so the ledger stays
      // the single source of truth. Setting the balance directly here would
      // make it unreconstructable, and reconcileBalance would erase the grant.
      creditBalance: 0,
    })
    .returning()

  await db.insert(members).values({
    id: crypto.randomUUID(),
    organizationId: org.id,
    userId: user.id,
    role: 'owner',
  })

  await writeLedgerEntry({
    organizationId: org.id,
    amount: FREE_STARTING_CREDITS,
    reason: 'subscription_grant',
    idempotencyKey: `signup-grant:${org.id}`,
    metadata: { kind: 'free_plan_signup_grant' },
  })

  return org
}

/**
 * Resolves the organization a request should act on, healing a session that has
 * no `activeOrganizationId`.
 *
 * This is needed because Better Auth creates the session *before* the
 * `user.create.after` hook has created the organization, so the very first
 * session of a new signup is always stamped null. Rather than depending on that
 * ordering, any request can recover: find the user's first membership, persist
 * it onto the session, and carry on. If the user somehow has no membership at
 * all, a personal organization is created on the spot.
 */
export async function resolveActiveOrganization(session: {
  id: string
  userId: string
  activeOrganizationId?: string | null
}): Promise<string> {
  if (session.activeOrganizationId) return session.activeOrganizationId

  const [membership] = await db
    .select({ organizationId: members.organizationId })
    .from(members)
    .where(eq(members.userId, session.userId))
    .orderBy(asc(members.createdAt))
    .limit(1)

  let orgId = membership?.organizationId

  if (!orgId) {
    // No membership anywhere — build the personal organization now.
    const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1)
    if (!user) throw new Error('Session references a user that no longer exists.')

    const org = await createPersonalOrganization(user)
    orgId = org.id
  }

  await db.update(sessions).set({ activeOrganizationId: orgId }).where(eq(sessions.id, session.id))

  return orgId
}
