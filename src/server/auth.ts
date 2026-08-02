import 'server-only'

import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { organization } from 'better-auth/plugins'
import { asc, eq } from 'drizzle-orm'

import { env } from '@/lib/env'
import { db, schema } from './db'
import { members, organizations } from './db/schema'

const hasGoogle = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)

/** Free plan grant. Kept here so a new signup is immediately usable. */
const FREE_STARTING_CREDITS = 10

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
 * Every user gets a personal organization at sign-up.
 *
 * The whole authorization model is org-scoped (`orgAction`, `requireOrg`), so a
 * user without one would be locked out of their own dashboard.
 */
async function createPersonalOrganization(user: { id: string; name: string; email: string }) {
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
      creditBalance: FREE_STARTING_CREDITS,
    })
    .returning()

  await db.insert(members).values({
    id: crypto.randomUUID(),
    organizationId: org.id,
    userId: user.id,
    role: 'owner',
  })

  return org
}

export const auth = betterAuth({
  appName: 'Brandora',
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,

  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
    usePlural: true,
  }),

  emailAndPassword: {
    enabled: true,
    // The gate is at generation time, not login — users can explore first.
    requireEmailVerification: false,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      // TODO(phase-2): send via Resend + React Email
      console.info(`[auth] password reset for ${user.email}: ${url}`)
    },
  },

  socialProviders: hasGoogle
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID!,
          clientSecret: env.GOOGLE_CLIENT_SECRET!,
        },
      }
    : {},

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      // TODO(phase-2): send via Resend + React Email
      console.info(`[auth] verify email for ${user.email}: ${url}`)
    },
  },

  // Postgres-backed. No Redis, no extra service.
  rateLimit: {
    enabled: true,
    storage: 'database',
    modelName: 'rateLimits',
    window: 60,
    max: 20,
    customRules: {
      '/sign-in/email': { window: 60, max: 5 },
      '/sign-up/email': { window: 3600, max: 5 },
      '/forget-password': { window: 3600, max: 3 },
      '/verify-email': { window: 3600, max: 10 },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // rolling refresh once per day
    cookieCache: { enabled: true, maxAge: 300 },
  },

  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await createPersonalOrganization(user)
        },
      },
    },
    session: {
      create: {
        /**
         * Stamp the active organization onto the session at creation, so RSC
         * pages and Server Actions can resolve the tenant without an extra
         * lookup on every request.
         */
        before: async (session) => {
          const [membership] = await db
            .select({ organizationId: members.organizationId })
            .from(members)
            .where(eq(members.userId, session.userId))
            .orderBy(asc(members.createdAt))
            .limit(1)

          return {
            data: { ...session, activeOrganizationId: membership?.organizationId ?? null },
          }
        },
      },
    },
  },

  user: {
    additionalFields: {
      locale: { type: 'string', defaultValue: 'en' },
      // input:false is load-bearing — without it a crafted sign-up payload
      // could set role:"admin" on itself.
      role: { type: 'string', defaultValue: 'user', input: false },
      status: { type: 'string', defaultValue: 'active', input: false },
    },
  },

  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      organizationLimit: 5,
      creatorRole: 'owner',
      sendInvitationEmail: async ({ email, organization: org }) => {
        // TODO(phase-2): send via Resend + React Email
        console.info(`[auth] invite ${email} to ${org.name}`)
      },
    }),
    // Must stay last — it flushes Set-Cookie headers in Next.js server actions.
    nextCookies(),
  ],
})

export type Auth = typeof auth
export type Session = Auth['$Infer']['Session']
