import assert from 'node:assert/strict'

import { config } from '../src/proxy'

/**
 * The proxy's matcher, asserted against the paths the browser posts telemetry to.
 *
 * Three tools in this app send their measurements to our own origin rather than
 * to a vendor domain — Sentry through /monitoring, PostHog through /ingest, and
 * Vercel Web Analytics through /_vercel — because ad blockers drop the vendor
 * domains. That makes all three ordinary paths as far as this proxy is
 * concerned, and locale negotiation redirects an ordinary path to /en/…, which
 * for a beacon means it is never delivered.
 *
 * Vercel's was missing and the failure was invisible for exactly the reason
 * this file exists: nothing errors. The dashboard says the feature is enabled,
 * the script loads, the page works, and the number stays at zero. Two of the
 * three were already excluded, so the rule was known — it simply was not
 * checked anywhere.
 *
 * The file-extension exclusion is why the script loaded while the beacon did
 * not: `/_vercel/insights/script.js` contains a dot and `/_vercel/insights/event`
 * does not. Any new telemetry path with no extension has the same problem.
 *
 * Usage: pnpm test:proxy
 */

const matcher = new RegExp(`^${config.matcher[0]}$`)

/** Must never reach locale negotiation. */
const TELEMETRY = [
  '/_vercel/insights/event',
  '/_vercel/insights/script.js',
  '/_vercel/speed-insights/vitals',
  '/ingest/e',
  '/ingest/static/array.js',
  '/monitoring',
  '/api/webhooks/polar',
]

/** Must still reach it — these are pages, and a page needs its locale. */
const PAGES = ['/', '/en/dashboard', '/dashboard/projects', '/pricing', '/ar/login']

let failures = 0

for (const path of TELEMETRY) {
  if (matcher.test(path)) {
    console.error(`✗ ${path} runs through the proxy — locale negotiation will redirect it`)
    failures++
  }
}

for (const path of PAGES) {
  if (!matcher.test(path)) {
    console.error(`✗ ${path} skips the proxy — it will not be locale-negotiated or guarded`)
    failures++
  }
}

assert.equal(failures, 0, `${failures} path(s) matched the wrong way`)
console.log(`✓ ${TELEMETRY.length} telemetry paths excluded, ${PAGES.length} pages negotiated`)
