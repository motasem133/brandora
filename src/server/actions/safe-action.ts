import 'server-only'

import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { createSafeActionClient } from 'next-safe-action'
import { z } from 'zod'

import { AppError, isAppError } from '@/lib/errors'
import { reportError } from '@/lib/observability'
import { auth } from '@/server/auth'
import { db } from '@/server/db'
import { members } from '@/server/db/schema'
import { resolveActiveOrganization } from '@/server/services/organizations'

/**
 * Server Actions are publicly callable HTTP endpoints. Every mutation is built
 * from one of the clients below so that a session and ownership check can never
 * be forgotten. Only the auth actions (login/register/forgot/reset) may use the
 * bare `actionClient`.
 */
export const actionClient = createSafeActionClient({
  defineMetadataSchema() {
    return z.object({ name: z.string() })
  },
  handleServerError(error, { metadata }) {
    // Expected failures carry their own message and are not faults.
    if (isAppError(error)) return error.message

    console.error('[action] unhandled error', error)
    reportError(error, { source: 'server-action', action: metadata?.name })
    return 'Something went wrong. Please try again.'
  },
})

/** Requires a valid session. */
export const authedAction = actionClient.use(async ({ next }) => {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new AppError('UNAUTHORIZED', 'Please sign in to continue.')
  if (session.user.status === 'suspended') {
    throw new AppError('FORBIDDEN', 'This account has been suspended.')
  }
  return next({ ctx: { user: session.user, session: session.session } })
})

/** Requires membership in the caller's active organization. */
export const orgAction = authedAction.use(async ({ next, ctx }) => {
  // Heals a session stamped before its organization existed.
  const orgId = await resolveActiveOrganization({
    id: ctx.session.id,
    userId: ctx.user.id,
    activeOrganizationId: ctx.session.activeOrganizationId,
  })

  const [membership] = await db
    .select()
    .from(members)
    .where(and(eq(members.organizationId, orgId), eq(members.userId, ctx.user.id)))
    .limit(1)

  if (!membership) throw new AppError('FORBIDDEN', 'You are not a member of this organization.')

  return next({ ctx: { ...ctx, orgId, orgRole: membership.role } })
})

/** Requires an organization owner. */
export const orgOwnerAction = orgAction.use(async ({ next, ctx }) => {
  if (ctx.orgRole !== 'owner') throw new AppError('FORBIDDEN', 'Only the owner can do this.')
  return next({ ctx })
})

/** Requires an organization owner or admin. */
export const orgAdminAction = orgAction.use(async ({ next, ctx }) => {
  if (ctx.orgRole !== 'owner' && ctx.orgRole !== 'admin') {
    throw new AppError('FORBIDDEN', 'Insufficient permissions.')
  }
  return next({ ctx })
})

/** Requires a Brandora platform admin. */
export const adminAction = authedAction.use(async ({ next, ctx }) => {
  if (ctx.user.role !== 'admin') throw new AppError('FORBIDDEN', 'Admins only.')
  return next({ ctx })
})
