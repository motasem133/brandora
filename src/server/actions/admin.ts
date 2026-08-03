'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { AppError } from '@/lib/errors'
import { adminAction } from '@/server/actions/safe-action'
import { writeLedgerEntry } from '@/server/billing/credits'
import { db } from '@/server/db'
import { plans, users } from '@/server/db/schema'

/**
 * Platform administration.
 *
 * Every action here is built on `adminAction`, which is the only thing standing
 * between these and the open internet — a Server Action is a public endpoint
 * whatever the UI does or does not render.
 */

export const updateUserStatus = adminAction
  .metadata({ name: 'admin-update-user-status' })
  .inputSchema(z.object({ userId: z.string().min(1), status: z.enum(['active', 'suspended']) }))
  .action(async ({ parsedInput, ctx }) => {
    if (parsedInput.userId === ctx.user.id) {
      throw new AppError('VALIDATION', 'You cannot suspend your own account.')
    }

    const [updated] = await db
      .update(users)
      .set({ status: parsedInput.status, updatedAt: new Date() })
      .where(eq(users.id, parsedInput.userId))
      .returning({ id: users.id })

    if (!updated) throw new AppError('NOT_FOUND', 'User not found.')

    revalidatePath('/[locale]/admin', 'layout')
    return { status: parsedInput.status }
  })

export const updateUserRole = adminAction
  .metadata({ name: 'admin-update-user-role' })
  .inputSchema(z.object({ userId: z.string().min(1), role: z.enum(['user', 'admin']) }))
  .action(async ({ parsedInput, ctx }) => {
    /*
     * Demoting yourself could leave the platform with no administrator and no
     * way back in through the UI.
     */
    if (parsedInput.userId === ctx.user.id) {
      throw new AppError('VALIDATION', 'You cannot change your own role.')
    }

    const [updated] = await db
      .update(users)
      .set({ role: parsedInput.role, updatedAt: new Date() })
      .where(eq(users.id, parsedInput.userId))
      .returning({ id: users.id })

    if (!updated) throw new AppError('NOT_FOUND', 'User not found.')

    revalidatePath('/[locale]/admin', 'layout')
    return { role: parsedInput.role }
  })

export const updatePlan = adminAction
  .metadata({ name: 'admin-update-plan' })
  .inputSchema(
    z.object({
      planId: z.uuid(),
      monthlyCredits: z.number().int().min(0).max(100_000),
      isActive: z.boolean(),
      websiteBuilder: z.boolean(),
      socialMediaKit: z.boolean(),
      vectorExport: z.boolean(),
      brandAssistant: z.boolean(),
      customDomain: z.boolean(),
      /*
       * Polar product ids, trimmed to null when cleared. Without these,
       * checkout has nothing to sell — and the yearly one is the difference
       * between offering annual billing and only appearing to.
       */
      polarProductIdMonthly: z.string().trim().max(120).nullable(),
      polarProductIdYearly: z.string().trim().max(120).nullable(),
    }),
  )
  .action(async ({ parsedInput }) => {
    const { planId, ...fields } = parsedInput

    const [updated] = await db
      .update(plans)
      .set({ ...fields, updatedAt: new Date() })
      .where(eq(plans.id, planId))
      .returning({ id: plans.id })

    if (!updated) throw new AppError('NOT_FOUND', 'Plan not found.')

    revalidatePath('/[locale]/admin', 'layout')
    revalidatePath('/[locale]/dashboard/billing', 'page')
    return { planId }
  })

/**
 * Grants or removes credits by hand.
 *
 * Goes through the ledger like every other movement, so support gestures and
 * corrections stay auditable rather than appearing as an unexplained balance.
 */
export const adjustCredits = adminAction
  .metadata({ name: 'admin-adjust-credits' })
  .inputSchema(
    z.object({
      organizationId: z.string().min(1),
      amount: z.number().int().refine((value) => value !== 0, 'Amount cannot be zero'),
      note: z.string().trim().max(200).optional(),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    await writeLedgerEntry({
      organizationId: parsedInput.organizationId,
      amount: parsedInput.amount,
      reason: 'admin_adjustment',
      metadata: { note: parsedInput.note ?? null, by: ctx.user.email },
      // A correction may legitimately take an account negative.
      allowNegative: parsedInput.amount < 0,
    })

    revalidatePath('/[locale]/admin', 'layout')
    return { amount: parsedInput.amount }
  })
