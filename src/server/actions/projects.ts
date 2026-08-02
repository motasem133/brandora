'use server'

import { and, eq, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

import { AppError } from '@/lib/errors'
import { createProjectSchema, projectIdSchema, updateProjectSchema } from '@/lib/validations/project'
import { orgAction } from '@/server/actions/safe-action'
import { db } from '@/server/db'
import { countProjects } from '@/server/db/queries/projects'
import { plans, projects, subscriptions } from '@/server/db/schema'

/** Falls back to the free plan's limits when an org has no subscription row. */
async function getPlanLimits(organizationId: string) {
  const [row] = await db
    .select({ plan: plans })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(eq(subscriptions.organizationId, organizationId))
    .limit(1)

  if (row?.plan) return row.plan

  const [free] = await db.select().from(plans).where(eq(plans.slug, 'free')).limit(1)
  return free ?? null
}

export const createProject = orgAction
  .metadata({ name: 'create-project' })
  .inputSchema(createProjectSchema)
  .action(async ({ parsedInput, ctx }) => {
    const plan = await getPlanLimits(ctx.orgId)

    if (plan && plan.maxProjects !== -1) {
      const existing = await countProjects(ctx.orgId)
      if (existing >= plan.maxProjects) {
        throw new AppError(
          'FEATURE_LOCKED',
          `Your plan allows ${plan.maxProjects} projects. Upgrade to create more.`,
        )
      }
    }

    // Feature flags are enforced server-side — a client can always send `true`.
    const needsWebsite = parsedInput.needsWebsite && (plan?.websiteBuilder ?? false)
    const needsSocialMedia = parsedInput.needsSocialMedia && (plan?.socialMediaKit ?? false)

    const [project] = await db
      .insert(projects)
      .values({
        organizationId: ctx.orgId,
        createdBy: ctx.user.id,
        title: parsedInput.businessName?.trim() || `${parsedInput.industry} brand`,
        businessName: parsedInput.businessName?.trim() || null,
        industry: parsedInput.industry,
        country: parsedInput.country,
        targetAudience: parsedInput.targetAudience,
        brandStyle: parsedInput.brandStyle,
        preferredColors: parsedInput.preferredColors,
        needsWebsite,
        needsSocialMedia,
        language: parsedInput.language,
        status: 'draft',
      })
      .returning()

    revalidatePath('/[locale]/dashboard', 'layout')

    return {
      projectId: project.id,
      // Surfaced so onboarding can explain why a requested feature is missing.
      downgraded: {
        website: parsedInput.needsWebsite && !needsWebsite,
        social: parsedInput.needsSocialMedia && !needsSocialMedia,
      },
    }
  })

export const updateProject = orgAction
  .metadata({ name: 'update-project' })
  .inputSchema(updateProjectSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { id, ...fields } = parsedInput

    const [updated] = await db
      .update(projects)
      .set({ ...fields, updatedAt: new Date() })
      .where(
        and(
          eq(projects.id, id),
          eq(projects.organizationId, ctx.orgId),
          isNull(projects.deletedAt),
        ),
      )
      .returning()

    if (!updated) throw new AppError('NOT_FOUND', 'Project not found.')

    revalidatePath('/[locale]/dashboard', 'layout')
    return { projectId: updated.id }
  })

export const deleteProject = orgAction
  .metadata({ name: 'delete-project' })
  .inputSchema(projectIdSchema)
  .action(async ({ parsedInput, ctx }) => {
    const [deleted] = await db
      .update(projects)
      .set({ deletedAt: new Date() })
      .where(and(eq(projects.id, parsedInput.id), eq(projects.organizationId, ctx.orgId)))
      .returning({ id: projects.id })

    if (!deleted) throw new AppError('NOT_FOUND', 'Project not found.')

    revalidatePath('/[locale]/dashboard', 'layout')
    return { success: true }
  })
