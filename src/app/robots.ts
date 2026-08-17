import type { MetadataRoute } from 'next'

import { siteUrl } from '@/lib/seo'

/**
 * Brandora's own robots.txt, for Brandora's own domain.
 *
 * `/robots.txt` is already named in the proxy matcher (`src/proxy.ts`) so that
 * a crawler on a *customer's* domain is rewritten onto that customer's site and
 * served their file from `app/sites/[subdomain]/robots.txt`. This one is what
 * the apex answers with — the case that, until now, 404'd.
 *
 * Everything signed-in is disallowed by prefix rather than by a `noindex` tag
 * on each page. There are twenty-odd routes under `[locale]` and four of them
 * are marketing; a rule that has to be remembered on every new dashboard page
 * is a rule that gets forgotten on one, and the failure is silent.
 *
 * The wildcard leads because every route carries a locale segment —
 * `/en/dashboard`, `/ar/dashboard` — so `/dashboard` alone would match nothing
 * real. Disallow is a crawling instruction, not an access control: these routes
 * are protected by the session check in the proxy, and this only keeps them out
 * of the index.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/*/dashboard',
          '/*/admin',
          '/*/onboarding',
          '/*/login',
          '/*/register',
          '/*/forgot-password',
          '/*/reset-password',
          '/*/accept-invitation/',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
