'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { AppError } from '@/lib/errors'
import { authedAction, orgOwnerAction } from '@/server/actions/safe-action'
import { db } from '@/server/db'
import { organizations, users } from '@/server/db/schema'

export const updateProfile = authedAction
  .metadata({ name: 'update-profile' })
  .inputSchema(
    z.object({
      name: z.string().trim().min(1).max(80),
      locale: z.enum(['en', 'ar']),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    await db
      .update(users)
      .set({ name: parsedInput.name, locale: parsedInput.locale, updatedAt: new Date() })
      .where(eq(users.id, ctx.user.id))

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
