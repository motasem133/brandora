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
   * Native addons must not be bundled — the bundler cannot place a .node
   * binary in an ESM chunk, and both of these load platform-specific binaries
   * at runtime. Listing them here makes Next require() them from node_modules
   * instead, which is also how they resolve correctly on Vercel.
   */
  serverExternalPackages: ['@neplex/vectorizer', 'sharp'],

  /*
   * Ship the native binaries these two packages resolve at runtime.
   *
   * `serverExternalPackages` keeps them out of the bundle and requires them
   * from `node_modules` instead, which is right for native code — but the file
   * tracer then has to work out which files to carry into the function, and it
   * cannot follow the platform switch these loaders perform. Production loaded
   * the JavaScript and failed on the library behind it:
   *
   *   Failed to load external module sharp-5843a61b03cbf433
   *   ERR_DLOPEN_FAILED: libvips-cpp.so.8.18.3: cannot open shared object file
   *
   * pnpm compounds it: `node_modules/sharp` is a symlink into `.pnpm`, and the
   * `@img/*` packages holding the real `.so` and `.node` files are never named
   * by any import. So they are included explicitly, by the path they actually
   * live at, for the one route whose module graph reaches them.
   */
  outputFileTracingIncludes: {
    /*
     * Only the binaries this platform runs — `linux-x64`.
     *
     * The first attempt globbed `@img+*` and `@neplex+vectorizer*`, which
     * matches every platform these packages publish: darwin, musl, arm64 and
     * win32, at two versions each. libvips alone is ~80MB a copy, so the build
     * compiled, then failed while deploying the outputs, because the function
     * was far past the size a serverless bundle may be.
     *
     * The versions are pinned to the majors `sharp@0.35` resolves — 0.35.x
     * pairs with libvips 1.3.x — so a sharp upgrade that changes them fails
     * loudly here rather than silently shipping a function with no binary in
     * it. The second copy in the tree, 0.34.5, is some other package's
     * dependency and is not what `import('sharp')` resolves to.
     */
    '/api/inngest': [
      './node_modules/.pnpm/sharp@0.35*/**/*',
      './node_modules/.pnpm/@img+sharp-linux-x64@0.35*/**/*',
      './node_modules/.pnpm/@img+sharp-libvips-linux-x64@1.3*/**/*',
      './node_modules/.pnpm/@neplex+vectorizer-linux-x64-gnu*/**/*',
    ],
  },

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
