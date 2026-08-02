'use server'

import { and, eq, ne } from 'drizzle-orm'
import { updateTag } from 'next/cache'
import { z } from 'zod'

import { pagesSchema, themeSchema } from '@/lib/blocks'
import { AppError } from '@/lib/errors'
import { orgAction, orgAdminAction } from '@/server/actions/safe-action'
import { db } from '@/server/db'
import { getOrgPlan } from '@/server/db/queries/plans'
import { projects, websiteAssets } from '@/server/db/schema'

/** Subdomains become public URLs, so the grammar is deliberately strict. */
const subdomainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(40)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, 'Use letters, numbers and hyphens only')

/** Names that would shadow app routes or imply official status. */
const RESERVED = new Set([
  'www', 'app', 'api', 'admin', 'dashboard', 'auth', 'login', 'register',
  'mail', 'smtp', 'ftp', 'cdn', 'static', 'assets', 'files', 'status',
  'support', 'help', 'blog', 'docs', 'brandora', 'billing', 'pricing',
])

async function assertOwnedProject(projectId: string, orgId: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.organizationId, orgId)))
    .limit(1)

  if (!project) throw new AppError('NOT_FOUND', 'Project not found.')
  return project
}

export const updateWebsiteContent = orgAction
  .metadata({ name: 'update-website-content' })
  .inputSchema(
    z.object({
      projectId: z.uuid(),
      pages: pagesSchema,
      theme: themeSchema.optional(),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    await assertOwnedProject(parsedInput.projectId, ctx.orgId)

    const [updated] = await db
      .update(websiteAssets)
      .set({
        pages: parsedInput.pages,
        ...(parsedInput.theme ? { customStyles: parsedInput.theme } : {}),
        updatedAt: new Date(),
      })
      .where(eq(websiteAssets.projectId, parsedInput.projectId))
      .returning()

    if (!updated) throw new AppError('NOT_FOUND', 'This project has no website yet.')

    // updateTag rather than revalidateTag: this runs inside a Server Action, so
    // the caller should immediately read its own write. Only a published site is
    // cached, so only then is there anything to purge.
    if (updated.isPublished && updated.subdomain) {
      updateTag(`site:${updated.subdomain}`)
    }

    return { savedAt: new Date().toISOString() }
  })

export const publishWebsite = orgAdminAction
  .metadata({ name: 'publish-website' })
  .inputSchema(z.object({ projectId: z.uuid(), subdomain: subdomainSchema }))
  .action(async ({ parsedInput, ctx }) => {
    await assertOwnedProject(parsedInput.projectId, ctx.orgId)

    const plan = await getOrgPlan(ctx.orgId)
    if (!plan?.websiteBuilder) {
      throw new AppError('FEATURE_LOCKED', 'Publishing is available on Basic and above.')
    }

    if (RESERVED.has(parsedInput.subdomain)) {
      throw new AppError('VALIDATION', 'That address is reserved. Please choose another.')
    }

    // Uniqueness is enforced by a unique index too; this exists to return a
    // useful message rather than a constraint violation.
    const [taken] = await db
      .select({ id: websiteAssets.id })
      .from(websiteAssets)
      .where(
        and(
          eq(websiteAssets.subdomain, parsedInput.subdomain),
          ne(websiteAssets.projectId, parsedInput.projectId),
        ),
      )
      .limit(1)

    if (taken) throw new AppError('VALIDATION', 'That address is already taken.')

    const [published] = await db
      .update(websiteAssets)
      .set({
        subdomain: parsedInput.subdomain,
        isPublished: true,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(websiteAssets.projectId, parsedInput.projectId))
      .returning()

    if (!published) throw new AppError('NOT_FOUND', 'This project has no website yet.')

    updateTag(`site:${parsedInput.subdomain}`)

    return { subdomain: parsedInput.subdomain, url: `/sites/${parsedInput.subdomain}` }
  })

export const unpublishWebsite = orgAdminAction
  .metadata({ name: 'unpublish-website' })
  .inputSchema(z.object({ projectId: z.uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    await assertOwnedProject(parsedInput.projectId, ctx.orgId)

    const [updated] = await db
      .update(websiteAssets)
      .set({ isPublished: false, updatedAt: new Date() })
      .where(eq(websiteAssets.projectId, parsedInput.projectId))
      .returning()

    if (updated?.subdomain) updateTag(`site:${updated.subdomain}`)

    return { success: true }
  })
