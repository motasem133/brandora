import 'server-only'

import { and, asc, eq, gt } from 'drizzle-orm'

import { db } from '@/server/db'
import { invitations, members, users } from '@/server/db/schema'

/**
 * Who is in a workspace, and who has been asked.
 *
 * Read with Drizzle rather than `auth.api.listInvitations`, for the reason
 * every other read in this app is: a server component asking its own database
 * should not make an HTTP request to itself to do it.
 */

export type TeamMember = {
  id: string
  userId: string
  name: string
  email: string
  role: string
  joinedAt: Date
}

export async function listMembers(organizationId: string): Promise<TeamMember[]> {
  const rows = await db
    .select({
      id: members.id,
      userId: members.userId,
      name: users.name,
      email: users.email,
      role: members.role,
      joinedAt: members.createdAt,
    })
    .from(members)
    .innerJoin(users, eq(users.id, members.userId))
    .where(eq(members.organizationId, organizationId))
    .orderBy(asc(members.createdAt))

  return rows
}

export type PendingInvitation = {
  id: string
  email: string
  role: string
  expiresAt: Date
}

/**
 * Invitations still worth showing.
 *
 * Expired ones are left out rather than listed as pending: they occupy no seat
 * and there is nothing to do about them but send another.
 */
export async function listPendingInvitations(
  organizationId: string,
): Promise<PendingInvitation[]> {
  return db
    .select({
      id: invitations.id,
      email: invitations.email,
      role: invitations.role,
      expiresAt: invitations.expiresAt,
    })
    .from(invitations)
    .where(
      and(
        eq(invitations.organizationId, organizationId),
        eq(invitations.status, 'pending'),
        gt(invitations.expiresAt, new Date()),
      ),
    )
    .orderBy(asc(invitations.createdAt))
}

/**
 * One invitation, by id, with the context the accept page needs to say what it
 * is an invitation *to*.
 *
 * Deliberately not organization-scoped — the whole point is that the person
 * opening it is not a member yet, and may not even have an account. The page
 * reveals nothing beyond the workspace name and who invited them, and only
 * once it has checked the invitation is live.
 */
export async function getInvitation(id: string) {
  const [row] = await db
    .select({
      id: invitations.id,
      email: invitations.email,
      role: invitations.role,
      status: invitations.status,
      expiresAt: invitations.expiresAt,
      organizationId: invitations.organizationId,
      inviterName: users.name,
      inviterEmail: users.email,
    })
    .from(invitations)
    .innerJoin(users, eq(users.id, invitations.inviterId))
    .where(eq(invitations.id, id))
    .limit(1)

  return row
}

/** Whether this user is already in this workspace. */
export async function isMember(organizationId: string, userId: string) {
  const [row] = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.organizationId, organizationId), eq(members.userId, userId)))
    .limit(1)

  return Boolean(row)
}
