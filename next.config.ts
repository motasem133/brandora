import createNextIntlPlugin from 'next-intl/plugin'
import type { NextConfig } from 'next'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  experimental: {
    // Server Actions are public endpoints; keep payloads small on purpose.
    serverActions: { bodySizeLimit: '2mb' },
  },
}

export default withNextIntl(nextConfig)
