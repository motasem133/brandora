import { withSentryConfig } from '@sentry/nextjs'
import createNextIntlPlugin from 'next-intl/plugin'
import type { NextConfig } from 'next'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/**
 * PostHog's ingest host, split into the two upstreams it serves: the API and
 * the static assets bundle. Derived from NEXT_PUBLIC_POSTHOG_HOST so pointing
 * at the EU region — or at a local collector in a test — needs no code change.
 */
function posthogUpstreams() {
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST
  if (!host) return null

  const assets = host.includes('://eu.')
    ? 'https://eu-assets.i.posthog.com'
    : host.includes('://us.')
      ? 'https://us-assets.i.posthog.com'
      : host

  return { api: host.replace(/\/$/, ''), assets: assets.replace(/\/$/, '') }
}

const nextConfig: NextConfig = {
  /*
   * There is no `serverExternalPackages` here any more, and that is the point.
   *
   * It listed `@neplex/vectorizer` and `sharp`, because a bundler cannot place
   * a `.node` binary in an ESM chunk and both loaded platform-specific ones at
   * runtime. Between them they caused every deployment failure this project
   * has had: ERR_DLOPEN_FAILED on libvips, a 207MB tracing include that would
   * not deploy, and an `/api/inngest` that died on startup because the loader
   * ran whenever anything imported its module graph.
   *
   * sharp was replaced by jimp; vectorising is now a model call. Nothing in
   * the server runtime is native, so nothing needs excusing from the bundler.
   */

  /*
   * PostHog's own domain is on every ad-block list, so requests to it are
   * dropped for a large share of visitors — and disproportionately for the
   * technical ones. Rewriting through this origin is the supported way to
   * measure them; without a host configured, no rewrite is added at all.
   */
  async rewrites() {
    const upstream = posthogUpstreams()
    if (!upstream) return []

    return [
      { source: '/ingest/static/:path*', destination: `${upstream.assets}/static/:path*` },
      { source: '/ingest/:path*', destination: `${upstream.api}/:path*` },
    ]
  },

  // PostHog's API is sensitive to a trailing slash being appended, which is
  // what Next does by default on the way through a rewrite.
  skipTrailingSlashRedirect: true,

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
