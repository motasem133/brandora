'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { headers } from 'next/headers'

import { and, gt } from 'drizzle-orm'

import { AppError } from '@/lib/errors'
import { authedAction, orgOwnerAction } from '@/server/actions/safe-action'
import { auth } from '@/server/auth'
import { db } from '@/server/db'
import { organizations, verifications } from '@/server/db/schema'

/**
 * A code the customer can actually use, at the moment they are asked for one.
 *
 * Sign-up sends a code and it lives ten minutes. Every surface that *asks* for
 * one appears later — the first run is not gated, so the box a customer meets
 * is the one blocking their second — and by then the code they were sent is
 * always dead. The panel opened "ready to receive" a code that no longer
 * existed, and the only way through was to guess that the secondary button was
 * the real first step.
 *
 * So the blocking gates call this when they open. It sends only when there is
 * no live code: a customer who arrived within the window types the one already
 * in their inbox rather than being handed a second and wondering which is
 * which, and reloading a gated page cannot mail anybody repeatedly.
 *
 * Better Auth's own limit — six sends an hour — is still underneath this.
 */
export const ensureVerificationCode = authedAction
  .metadata({ name: 'ensure-verification-code' })
  .inputSchema(z.object({}).optional())
  .action(async ({ ctx }) => {
    if (ctx.user.emailVerified) return { sent: false, reason: 'verified' as const }

    /* The identifier Better Auth's emailOTP plugin stores a verification code
       under. Read rather than written — this only asks whether one is alive. */
    const [live] = await db
      .select({ id: verifications.id })
      .from(verifications)
      .where(
        and(
          eq(verifications.identifier, `email-verification-otp-${ctx.user.email}`),
          gt(verifications.expiresAt, new Date()),
        ),
      )
      .limit(1)

    if (live) return { sent: false, reason: 'already_sent' as const }

    await auth.api.sendVerificationOTP({
      body: { email: ctx.user.email, type: 'email-verification' },
    })

    return { sent: true, reason: 'sent' as const }
  })

export const updateProfile = authedAction
  .metadata({ name: 'update-profile' })
  .inputSchema(
    z.object({
      name: z.string().trim().min(1).max(80),
      locale: z.enum(['en', 'ar']),
    }),
  )
  .action(async ({ parsedInput }) => {
    /*
     * Through Better Auth rather than straight to the table.
     *
     * Sessions are cached in the cookie for five minutes, and the pages read
     * the name from the session. A direct write updated the database and left
     * every screen showing the old value until the cache expired, which reads
     * as the save having failed.
     */
    await auth.api.updateUser({
      headers: await headers(),
      body: { name: parsedInput.name, locale: parsedInput.locale },
    })

    revalidatePath('/[locale]/dashboard', 'layout')
    return { name: parsedInput.name }
  })

/**
 * Renaming the workspace is owner-only.
 *
 * The name appears on invoices and in the admin panel, so it is closer to
 * company identity than a personal preference.
 */
export const updateOrganizationName = orgOwnerAction
  .metadata({ name: 'update-organization-name' })
  .inputSchema(z.object({ name: z.string().trim().min(1).max(80) }))
  .action(async ({ parsedInput, ctx }) => {
    const [updated] = await db
      .update(organizations)
      .set({ name: parsedInput.name })
      .where(eq(organizations.id, ctx.orgId))
      .returning({ id: organizations.id })

    if (!updated) throw new AppError('NOT_FOUND', 'Organization not found.')

    revalidatePath('/[locale]/dashboard', 'layout')
    return { name: parsedInput.name }
  })
