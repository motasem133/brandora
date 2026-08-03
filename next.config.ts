import { withSentryConfig } from '@sentry/nextjs'
import createNextIntlPlugin from 'next-intl/plugin'
import type { NextConfig } from 'next'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  /*
   * Native addons must not be bundled — the bundler cannot place a .node
   * binary in an ESM chunk, and both of these load platform-specific binaries
   * at runtime. Listing them here makes Next require() them from node_modules
   * instead, which is also how they resolve correctly on Vercel.
   */
  serverExternalPackages: ['@neplex/vectorizer', 'sharp'],

  experimental: {
    // Server Actions are public endpoints; keep payloads small on purpose.
    serverActions: { bodySizeLimit: '2mb' },

    /*
     * Never reuse a cached payload for a dynamic page on navigation. Moving
     * between project tabs otherwise re-showed state from before a generation
     * started, so work in progress appeared to have vanished.
     */
    staleTimes: { dynamic: 0, static: 180 },
  },
}

/**
 * Source maps are uploaded only when there is a token to upload them with, so a
 * local build and a CI build stay exactly as fast as before. Everything else
 * the plugin does — instrumenting the runtimes, tunnelling browser reports past
 * ad blockers — costs nothing when no DSN is configured.
 */
export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  silent: !process.env.CI,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },

  /*
   * Browser reports are proxied through the app's own origin. Sent straight to
   * ingest.sentry.io they are blocked by most ad blockers, which quietly
   * removes exactly the client-side errors this exists to see.
   */
  tunnelRoute: '/monitoring',
})
