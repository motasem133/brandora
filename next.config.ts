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

export default withNextIntl(nextConfig)
