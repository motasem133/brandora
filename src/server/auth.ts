import 'server-only'

import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { organization } from 'better-auth/plugins'
import { asc, eq } from 'drizzle-orm'

import { env } from '@/lib/env'
import { db, schema } from './db'
import { members } from './db/schema'
import { createPersonalOrganization } from './services/organizations'

const hasGoogle = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)

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
    // No modelName here on purpose: the default is `rateLimit`, and the
    // adapter's usePlural option turns it into the `rateLimits` table. Setting
    // it explicitly would be pluralised a second time into `rateLimitss`.
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
