import 'server-only'

import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { emailOTP, organization } from 'better-auth/plugins'
import { asc, eq } from 'drizzle-orm'

import { env } from '@/lib/env'
import { db, schema } from './db'
import { sendEmail } from './email/send'
import { members } from './db/schema'
import { createPersonalOrganization } from './services/organizations'

/**
 * Whether Google sign-in exists on this deployment.
 *
 * Exported because the sign-in and sign-up screens have to know: without these
 * keys `socialProviders` below is empty, and a button offering a provider that
 * is not registered is a control that fails when it is pressed.
 */
export const hasGoogle = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)

/**
 * How long a verification code stays good for.
 *
 * Long enough to switch to a mail app, wait for delivery and come back;
 * short enough that a code left visible on a shared screen stops working. The
 * same number is written into the email, so the two cannot disagree.
 */
export const OTP_MINUTES = 10

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
      await sendEmail({
        to: user.email,
        locale: (user as { locale?: 'en' | 'ar' }).locale ?? 'en',
        template: { kind: 'reset-password', url, name: user.name || user.email },
      })
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
    /*
     * Off, because the emailOTP plugin below sends the sign-up email now. Both
     * on means two emails land for one sign-up, saying different things.
     *
     * The link flow underneath is left configured on purpose: links already in
     * someone's inbox must keep working, and `/verify-email` is still the
     * endpoint that honours them.
     */
    sendOnSignUp: false,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        locale: (user as { locale?: 'en' | 'ar' }).locale ?? 'en',
        template: { kind: 'verify-email', url, name: user.name || user.email },
      })
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
      /*
       * Sending is limited per hour because each one is an email someone did
       * not necessarily ask for; verifying is limited per minute because that
       * is the guessing surface. Three attempts per code plus twenty tries an
       * hour leaves a six-digit space effectively unsearchable.
       */
      '/email-otp/send-verification-otp': { window: 3600, max: 6 },
      '/email-otp/verify-email': { window: 60, max: 20 },
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
    /*
     * A six-digit code, so verification happens without leaving the page.
     *
     * The link flow is still configured above and still works — an old email
     * in someone's inbox must not stop working because this shipped — but the
     * code is what sign-up sends now. The difference is where verification
     * happens: a link opens a second tab, verifies there, and leaves the tab
     * the customer was actually working in showing "unverified" until it is
     * reloaded. Every surface that gates on verification had to poll to notice.
     * A code is typed into the page that is blocked, so that page learns the
     * answer directly.
     */
    emailOTP({
      otpLength: 6,
      expiresIn: OTP_MINUTES * 60,
      /*
       * The plugin owns the sign-up email, and `emailVerification.sendOnSignUp`
       * above is off so there is exactly one sender for that moment.
       *
       * `overrideDefaultEmailVerification` looked like the tidier switch and is
       * not used, because it does not work here: it supplies a replacement
       * `sendVerificationEmail` through the plugin's `init`, and an explicit
       * one in this file outranks it. Set that way, sign-up went on sending the
       * link — which a local run showed immediately, logging `verify-email`
       * where `verify-code` was expected.
       */
      sendVerificationOnSignUp: true,
      // Codes are compared, never displayed back, so there is no reason for a
      // readable one to sit in the database. A leaked backup does not become a
      // set of working verification codes.
      storeOTP: 'hashed',
      // Three guesses per code. A six-digit code brute-forced at the rate
      // limit below would still take years, but there is no reason to leave
      // a code alive after it has clearly been mistyped.
      allowedAttempts: 3,
      sendVerificationOTP: async ({ email, otp }) => {
        const [user] = await db
          .select({ name: schema.users.name, locale: schema.users.locale })
          .from(schema.users)
          .where(eq(schema.users.email, email))
          .limit(1)

        await sendEmail({
          to: email,
          locale: user?.locale ?? 'en',
          template: {
            kind: 'verify-code',
            code: otp,
            name: user?.name || email,
            minutes: OTP_MINUTES,
          },
        })
      },
    }),
    organization({
      allowUserToCreateOrganization: true,
      organizationLimit: 5,
      creatorRole: 'owner',
      sendInvitationEmail: async ({ email, inviter, organization: org, id }) => {
        await sendEmail({
          to: email,
          template: {
            kind: 'org-invite',
            url: `${env.NEXT_PUBLIC_APP_URL}/en/accept-invitation/${id}`,
            inviter: inviter.user.name || inviter.user.email,
            organization: org.name,
          },
        })
      },
    }),
    // Must stay last — it flushes Set-Cookie headers in Next.js server actions.
    nextCookies(),
  ],
})

export type Auth = typeof auth
export type Session = Auth['$Infer']['Session']
