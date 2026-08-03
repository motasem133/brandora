'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { headers } from 'next/headers'

import { AppError } from '@/lib/errors'
import { authedAction, orgOwnerAction } from '@/server/actions/safe-action'
import { auth } from '@/server/auth'
import { db } from '@/server/db'
import { organizations } from '@/server/db/schema'

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
