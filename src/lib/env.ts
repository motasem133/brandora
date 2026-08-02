import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

/**
 * Validated environment variables.
 *
 * Parsed at boot, so a missing variable fails the build rather than the first
 * request that happens to need it. Variables for phases not yet built are
 * optional here and become required as their features land.
 */
export const env = createEnv({
  server: {
    // --- Phase 1: database + auth ---
    DATABASE_URL: z.string().min(1),
    /** Direct (non-pooled) connection. Required for migrations. */
    DATABASE_URL_UNPOOLED: z.string().min(1).optional(),

    BETTER_AUTH_SECRET: z.string().min(32, 'Use at least 32 bytes: openssl rand -base64 32'),
    BETTER_AUTH_URL: z.string().url(),

    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),

    // --- Phase 3+: AI ---
    OPENROUTER_API_KEY: z.string().min(1).optional(),
    BYTEPLUS_API_KEY: z.string().min(1).optional(),
    BYTEPLUS_BASE_URL: z.string().url().default('https://ark.ap-southeast.bytepluses.com/api/v3'),

    INNGEST_EVENT_KEY: z.string().min(1).optional(),
    INNGEST_SIGNING_KEY: z.string().min(1).optional(),

    // --- Phase 4+: storage ---
    R2_ACCOUNT_ID: z.string().min(1).optional(),
    R2_ACCESS_KEY_ID: z.string().min(1).optional(),
    R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    R2_BUCKET_NAME: z.string().min(1).optional(),
    R2_PUBLIC_URL: z.string().url().optional(),

    // --- Phase 6+: billing ---
    POLAR_ACCESS_TOKEN: z.string().min(1).optional(),
    POLAR_WEBHOOK_SECRET: z.string().min(1).optional(),
    POLAR_SERVER: z.enum(['sandbox', 'production']).default('sandbox'),

    // --- email ---
    RESEND_API_KEY: z.string().min(1).optional(),
    EMAIL_FROM: z.string().min(1).default('Brandora <onboarding@resend.dev>'),

    // --- seeding ---
    SEED_ADMIN_EMAIL: z.string().email().optional(),
    SEED_ADMIN_PASSWORD: z.string().min(8).optional(),
  },

  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },

  /**
   * Next.js does not inline `process.env` on the server in all runtimes, so
   * every variable is destructured explicitly.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    BYTEPLUS_API_KEY: process.env.BYTEPLUS_API_KEY,
    BYTEPLUS_BASE_URL: process.env.BYTEPLUS_BASE_URL,
    INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY,
    INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY,
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
    R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
    POLAR_ACCESS_TOKEN: process.env.POLAR_ACCESS_TOKEN,
    POLAR_WEBHOOK_SECRET: process.env.POLAR_WEBHOOK_SECRET,
    POLAR_SERVER: process.env.POLAR_SERVER,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    SEED_ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL,
    SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },

  emptyStringAsUndefined: true,
  skipValidation: process.env.SKIP_ENV_VALIDATION === 'true',
})
