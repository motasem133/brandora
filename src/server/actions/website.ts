'use server'

import { and, eq, ne } from 'drizzle-orm'
import { updateTag } from 'next/cache'
import { z } from 'zod'

import { pagesSchema, themeSchema } from '@/lib/blocks'
import { env } from '@/lib/env'
import { AppError } from '@/lib/errors'
import { orgAction, orgAdminAction } from '@/server/actions/safe-action'
import { db } from '@/server/db'
import { getOrgPlan } from '@/server/db/queries/plans'
import { countCustomDomains } from '@/server/db/queries/sites'
import { projects, websiteAssets } from '@/server/db/schema'
import { attachDomain, detachDomain, domainStatus } from '@/server/services/domains'

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

/**
 * A hostname the customer already owns. Deliberately not a URL: pasting
 * `https://theircompany.com/` is the common mistake, so the transform strips
 * the scheme, any path and a trailing dot before validating.
 */
const customDomainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .transform((value) => value.replace(/^https?:\/\//, '').replace(/[/?#].*$/, '').replace(/\.$/, ''))
  .pipe(
    z
      .string()
      .min(4)
      .max(253)
      .regex(
        /^(?=.{1,253}$)(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/,
        'Enter a domain like example.com',
      ),
  )

/** The app's own host, so nobody can attach it and take over the app. */
function appHostname() {
  return new URL(env.NEXT_PUBLIC_APP_URL).hostname
}

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

/**
 * Attaches a customer's own domain to their published site.
 *
 * Two independent steps hide behind one button: Vercel must accept the domain
 * onto the project, and the customer must point DNS at it. This returns the
 * records for the second step rather than pretending the domain is live.
 */
export const attachCustomDomain = orgAdminAction
  .metadata({ name: 'attach-custom-domain' })
  .inputSchema(z.object({ projectId: z.uuid(), domain: customDomainSchema }))
  .action(async ({ parsedInput, ctx }) => {
    await assertOwnedProject(parsedInput.projectId, ctx.orgId)

    const plan = await getOrgPlan(ctx.orgId)
    if (!plan?.customDomain) {
      throw new AppError('FEATURE_LOCKED', 'Custom domains are available on Creator and above.')
    }

    /*
     * How many, not whether. Creator includes one domain and Studio any number,
     * so the boolean above answers the wrong question on its own.
     *
     * Checked before `attachDomain` talks to Vercel: refusing after the domain
     * is registered there would leave it attached to the deployment with
     * nothing in our database pointing at it.
     */
    if (plan.maxCustomDomains >= 0) {
      const used = await countCustomDomains(ctx.orgId, parsedInput.projectId)
      if (used >= plan.maxCustomDomains) {
        throw new AppError(
          'FEATURE_LOCKED',
          plan.maxCustomDomains === 1
            ? 'Your plan includes one custom domain, and it is in use. Remove it, or upgrade to Studio for as many as you like.'
            : `Your plan includes ${plan.maxCustomDomains} custom domains, and they are all in use. Remove one, or upgrade to Studio.`,
        )
      }
    }

    const appHost = appHostname()
    if (parsedInput.domain === appHost || parsedInput.domain.endsWith(`.${appHost}`)) {
      throw new AppError('VALIDATION', 'That domain belongs to Brandora. Use your own domain.')
    }

    const [site] = await db
      .select()
      .from(websiteAssets)
      .where(eq(websiteAssets.projectId, parsedInput.projectId))
      .limit(1)

    if (!site) throw new AppError('NOT_FOUND', 'This project has no website yet.')
    if (!site.isPublished) {
      throw new AppError('VALIDATION', 'Publish the site before attaching a domain.')
    }

    // Same reason as the subdomain check: a friendly message instead of a
    // unique-constraint violation.
    const [taken] = await db
      .select({ id: websiteAssets.id })
      .from(websiteAssets)
      .where(
        and(
          eq(websiteAssets.customDomain, parsedInput.domain),
          ne(websiteAssets.projectId, parsedInput.projectId),
        ),
      )
      .limit(1)

    if (taken) throw new AppError('VALIDATION', 'That domain is already in use.')

    // Vercel first: if it refuses the domain, nothing is stored, so the column
    // never claims a domain the platform will not serve.
    const status = await attachDomain(parsedInput.domain)

    await db
      .update(websiteAssets)
      .set({ customDomain: parsedInput.domain, updatedAt: new Date() })
      .where(eq(websiteAssets.projectId, parsedInput.projectId))

    return status
  })

/** Re-reads the domain's verification and DNS state from Vercel. */
export const refreshCustomDomain = orgAdminAction
  .metadata({ name: 'refresh-custom-domain' })
  .inputSchema(z.object({ projectId: z.uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    await assertOwnedProject(parsedInput.projectId, ctx.orgId)

    const [site] = await db
      .select({ customDomain: websiteAssets.customDomain })
      .from(websiteAssets)
      .where(eq(websiteAssets.projectId, parsedInput.projectId))
      .limit(1)

    if (!site?.customDomain) throw new AppError('NOT_FOUND', 'No domain is attached.')

    return await domainStatus(site.customDomain)
  })

export const removeCustomDomain = orgAdminAction
  .metadata({ name: 'remove-custom-domain' })
  .inputSchema(z.object({ projectId: z.uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    await assertOwnedProject(parsedInput.projectId, ctx.orgId)

    const [site] = await db
      .select({ customDomain: websiteAssets.customDomain })
      .from(websiteAssets)
      .where(eq(websiteAssets.projectId, parsedInput.projectId))
      .limit(1)

    if (!site?.customDomain) return { success: true }

    /*
     * Clear the column even if Vercel errors. Leaving a domain the customer
     * asked to remove attached to their site is worse than leaving a stale
     * entry in the Vercel project, which an admin can sweep.
     */
    try {
      await detachDomain(site.customDomain)
    } catch (error) {
      console.error('[domains] detach failed, clearing locally anyway', error)
    }

    await db
      .update(websiteAssets)
      .set({ customDomain: null, updatedAt: new Date() })
      .where(eq(websiteAssets.projectId, parsedInput.projectId))

    return { success: true }
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
