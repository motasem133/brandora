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

/** Any pattern matching means the proxy runs, which is how Next reads it. */
const matches = (path: string) =>
  config.matcher.some((pattern) => new RegExp(`^${pattern}$`).test(path))

/**
 * Must never reach locale negotiation.
 *
 * The Google verification file is in here for the same reason the beacon is:
 * a proof-of-ownership file has to answer on the bare path Google asks for.
 * Locale-redirected to /en/google….html it would 404, and the verification
 * would fail with nothing on the page to explain why. It survives today by the
 * file-extension rule rather than by an explicit exemption, which is exactly
 * the kind of accident worth pinning down before somebody tightens the regex.
 */
const TELEMETRY = [
  '/_vercel/insights/event',
  '/_vercel/insights/script.js',
  '/_vercel/speed-insights/vitals',
  '/ingest/e',
  '/ingest/static/array.js',
  '/monitoring',
  '/api/webhooks/polar',
  '/googlea59464b81181ee2d.html',
]

/** Must still reach it — these are pages, and a page needs its locale. */
const PAGES = ['/', '/en/dashboard', '/dashboard/projects', '/pricing', '/ar/login']

/**
 * Must run through the proxy despite having a dot in them.
 *
 * These two are the exception to the file-extension rule. A crawler on a
 * customer's own domain asks for `/sitemap.xml`, and if the proxy does not run
 * the request is never rewritten onto that customer's site — the answer is
 * whatever the app has at that path, which is Brandora's own file served under
 * someone else's domain. The proxy passes both through untouched on the app's
 * host, so being matched costs nothing there.
 */
const CRAWLERS = ['/sitemap.xml', '/robots.txt']

let failures = 0

for (const path of TELEMETRY) {
  if (matches(path)) {
    console.error(`✗ ${path} runs through the proxy — locale negotiation will redirect it`)
    failures++
  }
}

for (const path of PAGES) {
  if (!matches(path)) {
    console.error(`✗ ${path} skips the proxy — it will not be locale-negotiated or guarded`)
    failures++
  }
}

for (const path of CRAWLERS) {
  if (!matches(path)) {
    console.error(`✗ ${path} skips the proxy — a customer's domain will serve the app's own file`)
    failures++
  }
}

assert.equal(failures, 0, `${failures} path(s) matched the wrong way`)
console.log(
  `✓ ${TELEMETRY.length} telemetry paths excluded, ${PAGES.length} pages negotiated, ` +
    `${CRAWLERS.length} crawler paths rewritten`,
)
