import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { emailOTP, organization } from "better-auth/plugins";
import { asc, eq } from "drizzle-orm";

import { APIError } from "better-auth/api";

import { env } from "@/lib/env";
import { OTP_MINUTES } from "@/lib/otp";
import { db, schema } from "./db";
import { seatsForOrg, seatUsage } from "./db/queries/plans";
import { sendEmail } from "./email/send";
import { members, organizations } from "./db/schema";
import { createPersonalOrganization } from "./services/organizations";

/** The language an invitation email and its landing page should be in. */
async function organizationLocale(
  organizationId: string,
): Promise<"en" | "ar"> {
  const [org] = await db
    .select({ locale: organizations.locale })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  return org?.locale ?? "en";
}

/**
 * Whether Google sign-in exists on this deployment.
 *
 * Exported because the sign-in and sign-up screens have to know: without these
 * keys `socialProviders` below is empty, and a button offering a provider that
 * is not registered is a control that fails when it is pressed.
 */
export const hasGoogle = Boolean(
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET,
);

/**
 * The hostnames a preview deployment answers on.
 *
 * Better Auth refuses a request whose `Origin` is not its `baseURL`, which is
 * correct and is what stops another site posting a sign-in through someone's
 * browser. But `BETTER_AUTH_URL` is the production domain in every deployed
 * environment, so on a preview every sign-in came back `INVALID_ORIGIN` — and
 * the form, having no shape for that, simply span. No preview build has ever
 * been possible to log into, which quietly made previews useless for reviewing
 * any of the product that sits behind a session, i.e. nearly all of it.
 *
 * Only on previews, and only the two hostnames Vercel itself assigns this
 * deployment: the immutable per-deployment URL and the branch alias. Production
 * gets nothing added, so the check there is exactly as strict as it was.
 */
const previewOrigins =
  process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production"
    ? [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]
        .filter(Boolean)
        .map((host) => `https://${host}`)
    : [];

export const auth = betterAuth({
  appName: "Brandora",
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: previewOrigins,
  secret: env.BETTER_AUTH_SECRET,

  database: drizzleAdapter(db, {
    provider: "pg",
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
        locale: (user as { locale?: "en" | "ar" }).locale ?? "en",
        template: {
          kind: "reset-password",
          url,
          name: user.name || user.email,
        },
      });
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
    /*
     * A day, not the default hour.
     *
     * The only thing that sends a link now is the reminder sweep, which runs at
     * a fixed hour and reaches people while they are asleep or at work. An hour
     * would expire most of them before they were read — and a verification mail
     * whose link is dead on arrival is worse than none, because it teaches the
     * customer the product is broken rather than that they were slow.
     */
    expiresIn: 60 * 60 * 24,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        locale: (user as { locale?: "en" | "ar" }).locale ?? "en",
        template: { kind: "verify-email", url, name: user.name || user.email },
      });
    },
  },

  // Postgres-backed. No Redis, no extra service.
  rateLimit: {
    enabled: true,
    storage: "database",
    // No modelName here on purpose: the default is `rateLimit`, and the
    // adapter's usePlural option turns it into the `rateLimits` table. Setting
    // it explicitly would be pluralised a second time into `rateLimitss`.
    window: 60,
    max: 20,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 3600, max: 5 },
      "/forget-password": { window: 3600, max: 3 },
      "/verify-email": { window: 3600, max: 10 },
      /*
       * Sending is limited per hour because each one is an email someone did
       * not necessarily ask for; verifying is limited per minute because that
       * is the guessing surface. Three attempts per code plus twenty tries an
       * hour leaves a six-digit space effectively unsearchable.
       */
      "/email-otp/send-verification-otp": { window: 3600, max: 6 },
      "/email-otp/verify-email": { window: 60, max: 20 },
    },
  },

  /**
   * Where the client IP comes from — which is what every limit above is
   * counted against.
   *
   * This is the default value, written out. Normally that would be noise; here
   * it is the point, because the default only works by virtue of something
   * about *this* host, and nothing in the file said so.
   *
   * Better Auth will not take a client IP from a forwarded chain it cannot
   * attribute. With no `trustedProxies` set it accepts the header only when it
   * holds exactly one address — anything longer is rejected, because the
   * leftmost entry of an `X-Forwarded-For` chain is written by the client and
   * a limiter keyed on it can be stepped around by rotating a header.
   *
   * On Vercel that single value is guaranteed: the platform overwrites this
   * header at the edge and does not forward external ones, precisely to stop
   * that spoof. So every rule above is per client IP, as intended.
   *
   * ## What breaks it
   *
   * Putting anything in front of Vercel — Cloudflare, a custom reverse proxy,
   * an Enterprise trusted-proxy arrangement — makes the header a chain, and the
   * chain is refused. The failure is not that limiting stops; it is that every
   * request in the world falls into one shared bucket named `no-trusted-ip`, so
   * `/sign-up/email` becomes **five sign-ups an hour for the entire product**
   * rather than five per person. Signup is the whole funnel, and it would look
   * from the outside like the product had simply stopped converting.
   *
   * It announces itself with a single `logger.warn` per instance and nothing
   * else, which on serverless is close to invisible. `scripts/system-test.mjs`
   * therefore asserts that the shared bucket is never written to — run against
   * production, that check is the alarm this has no other way of raising.
   *
   * If a proxy is ever added, the fix is `trustedProxies` set to that proxy's
   * actual addresses or CIDR ranges. Adding more header names here is not the
   * fix and is worse than the problem: a header this host does not overwrite is
   * one the client controls, and trusting it removes the limit altogether.
   */
  advanced: {
    ipAddress: {
      ipAddressHeaders: ["x-forwarded-for"],
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
          await createPersonalOrganization(user);
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
            .limit(1);

          return {
            data: {
              ...session,
              activeOrganizationId: membership?.organizationId ?? null,
            },
          };
        },
      },
    },
  },

  user: {
    additionalFields: {
      locale: { type: "string", defaultValue: "en" },
      // input:false is load-bearing — without it a crafted sign-up payload
      // could set role:"admin" on itself.
      role: { type: "string", defaultValue: "user", input: false },
      status: { type: "string", defaultValue: "active", input: false },
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
      storeOTP: "hashed",
      // Three guesses per code. A six-digit code brute-forced at the rate
      // limit below would still take years, but there is no reason to leave
      // a code alive after it has clearly been mistyped.
      allowedAttempts: 3,
      sendVerificationOTP: async ({ email, otp }) => {
        const [user] = await db
          .select({ name: schema.users.name, locale: schema.users.locale })
          .from(schema.users)
          .where(eq(schema.users.email, email))
          .limit(1);

        await sendEmail({
          to: email,
          locale: user?.locale ?? "en",
          template: {
            kind: "verify-code",
            code: otp,
            name: user?.name || email,
            minutes: OTP_MINUTES,
          },
        });
      },
    }),
    organization({
      allowUserToCreateOrganization: true,
      organizationLimit: 5,
      creatorRole: "owner",
      /*
       * Seats come from the plan, so this is the gate that makes them real. It
       * fires wherever a membership row is created — accepting an invitation,
       * or being added directly.
       */
      membershipLimit: async (_user, org) => seatsForOrg(org.id),
      invitationExpiresIn: 60 * 60 * 24 * 7,
      /* Re-inviting the same address replaces the pending invitation rather
         than stacking a second one against the same seat. */
      cancelPendingInvitationsOnReInvite: true,
      organizationHooks: {
        /*
         * The plugin checks `membershipLimit` when an invitation is *accepted*,
         * not when it is created — so without this an owner on three seats can
         * send ten invitations and the fourth person to accept is the one who
         * gets refused. Pending invitations are counted as spoken for.
         */
        beforeCreateInvitation: async ({ invitation }) => {
          const { seats, taken } = await seatUsage(invitation.organizationId);
          if (taken >= seats) {
            throw new APIError("FORBIDDEN", {
              message:
                seats === 1
                  ? "Your plan includes one seat, and it is taken. Remove a member, cancel a pending invitation, or upgrade."
                  : `Your plan includes ${seats} seats, and they are all taken. Remove a member, cancel a pending invitation, or upgrade.`,
            });
          }
        },
      },
      sendInvitationEmail: async ({
        email,
        inviter,
        organization: org,
        id,
      }) => {
        /*
         * The link used to hardcode /en/, so an Arabic workspace invited people
         * into an English page. Organizations carry their own locale.
         */
        const locale = await organizationLocale(org.id);

        await sendEmail({
          to: email,
          locale,
          template: {
            kind: "org-invite",
            url: `${env.NEXT_PUBLIC_APP_URL}/${locale}/accept-invitation/${id}`,
            inviter: inviter.user.name || inviter.user.email,
            organization: org.name,
          },
        });
      },
    }),
    // Must stay last — it flushes Set-Cookie headers in Next.js server actions.
    nextCookies(),
  ],
});

export type Auth = typeof auth;
export type Session = Auth["$Infer"]["Session"];
