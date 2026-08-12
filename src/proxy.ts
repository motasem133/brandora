import createIntlMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'

import { routing } from '@/i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

/** Paths that require a session, checked after the locale prefix is stripped. */
const PROTECTED = ['/dashboard', '/onboarding', '/admin']

/*
 * Bouncing a signed-in visitor off /login used to happen here, from the
 * presence of the cookie. It happens in the pages now — see
 * `redirectIfSignedIn` — because presence is a guess and the guess can
 * disagree with the database.
 *
 * When it disagreed, the two halves bounced the visitor between them forever:
 * /dashboard found no session and sent them to /login, this sent them back
 * because the cookie was still in the browser, and the tab was bricked with
 * nothing but 307s. Deleting the account while a browser still held the cookie
 * did it; so would a revoked session or a restored backup.
 *
 * The redirect below stays, because it is only a shortcut. It refuses entry to
 * a page whose own code refuses entry anyway, and a cookie that is present but
 * dead now fails at the layout and lands somewhere that renders.
 *
 * /reset-password was deliberately absent from the old guest-only list: it is
 * reached from an emailed link carrying a token, and someone still signed in on
 * that browser is exactly the person who needs it. It still is — the three
 * pages that call `redirectIfSignedIn` do not include it.
 */

/** Hostnames that are the app itself rather than a customer's published site. */
const APP_HOSTS = new Set(['localhost', '127.0.0.1'])

/** Labels that belong to the app even though they sit where a subdomain does. */
const RESERVED_SUBDOMAINS = new Set(['www'])

/**
 * Extracts the customer subdomain from a host, or null when the host is the app.
 *
 * Supports `{sub}.brandora.enigmitic.com` in production and
 * `{sub}.localhost:3000` in development, so published sites can be exercised
 * locally exactly as they behave deployed.
 */
function customerSubdomain(host: string | null, appHost: string): string | null {
  if (!host) return null

  const hostname = host.split(':')[0]
  if (APP_HOSTS.has(hostname) || hostname === appHost) return null

  let label: string | null = null

  if (hostname.endsWith(`.${appHost}`)) {
    label = hostname.slice(0, -(appHost.length + 1))
  } else if (hostname.endsWith('.localhost')) {
    // `{sub}.localhost` — the development equivalent of a wildcard subdomain.
    label = hostname.slice(0, -'.localhost'.length)
  }

  if (!label || RESERVED_SUBDOMAINS.has(label)) return null

  /*
   * Exactly one label deep. The wildcard certificate covers no more than that,
   * and treating `a.b.brandora.enigmitic.com` as a customer named "a.b" would
   * serve a 404 where the app should answer.
   */
  if (label.includes('.')) return null

  return label
}

/**
 * Hosts that reach the app on something other than its own domain, and are
 * therefore never a customer's attached domain: Vercel's own deployment URLs,
 * bare IP addresses (the LAN address `next dev` prints), and anything with no
 * dot at all.
 */
function isPlatformHost(hostname: string) {
  return (
    hostname.endsWith('.vercel.app') ||
    hostname.endsWith('.localhost') ||
    !hostname.includes('.') ||
    /^[\d.]+$/.test(hostname)
  )
}

/**
 * A Business-plan customer's own domain, pointed here by CNAME or A record.
 *
 * Unlike a subdomain this cannot be recognised from the host alone — whether
 * `theircompany.com` is attached lives in the database. The lookup happens in
 * the site route, where a database connection exists; the proxy only decides
 * that the host is not the app's and hands the hostname over. An unattached
 * domain therefore 404s at the route rather than here.
 */
function customerDomain(host: string | null, appHost: string): string | null {
  if (!host) return null

  const hostname = host.split(':')[0]
  if (hostname === appHost || hostname.endsWith(`.${appHost}`)) return null
  if (APP_HOSTS.has(hostname) || isPlatformHost(hostname)) return null

  return hostname
}

/**
 * Proxy (formerly middleware) handles subdomain routing, locale negotiation
 * and *redirects only*.
 *
 * It is deliberately not a security boundary: it reads the session cookie
 * without verifying it, because verification needs a database round trip that
 * would run on every request. Real enforcement lives in `requireSession()` /
 * `orgAction`, which every page and action calls regardless.
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const appHost = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')
    .replace(/^https?:\/\//, '')
    .split(':')[0]

  const host = request.headers.get('host')

  // A customer subdomain serves that customer's published site, nothing else.
  const subdomain = customerSubdomain(host, appHost)
  if (subdomain) {
    return NextResponse.rewrite(new URL(`/sites/${subdomain}${pathname}`, request.url))
  }

  // As does a domain the customer attached themselves. Hostnames always contain
  // a dot and subdomains never do, so the site route can tell them apart.
  const domain = customerDomain(host, appHost)
  if (domain) {
    return NextResponse.rewrite(new URL(`/sites/${domain}${pathname}`, request.url))
  }

  /*
   * Published sites are the customer's own pages, not part of the Brandora app.
   * They carry no locale prefix, so locale negotiation must not touch them —
   * otherwise /sites/acme redirects to /en/sites/acme and 404s.
   */
  if (pathname.startsWith('/sites')) {
    return NextResponse.next()
  }

  /*
   * On the app's own host these two are not pages and must not be negotiated:
   * /sitemap.xml would become /en/sitemap.xml, which is not an address any
   * crawler asks for. They are in the matcher only so that the rewrites above
   * can catch them on a customer's host — see the note there.
   */
  if (pathname === '/sitemap.xml' || pathname === '/robots.txt') {
    return NextResponse.next()
  }

  // Strip the locale prefix so route matching is locale-agnostic.
  const segments = pathname.split('/')
  const maybeLocale = segments[1]
  const isLocale = (routing.locales as readonly string[]).includes(maybeLocale)
  const pathWithoutLocale = isLocale ? `/${segments.slice(2).join('/')}` : pathname
  const locale = isLocale ? maybeLocale : routing.defaultLocale

  const hasSessionCookie =
    request.cookies.has('better-auth.session_token') ||
    request.cookies.has('__Secure-better-auth.session_token')

  const isProtected = PROTECTED.some((p) => pathWithoutLocale.startsWith(p))

  if (isProtected && !hasSessionCookie) {
    const url = new URL(`/${locale}/login`, request.url)
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  return intlMiddleware(request)
}

export const config = {
  /*
   * Skip API routes, static assets, and anything with a file extension.
   *
   * /monitoring and /ingest are the paths the browser posts Sentry reports and
   * PostHog events to. Left in, locale negotiation redirects them to
   * /en/monitoring and /en/ingest and every client-side report is lost —
   * silently, which is the one failure this kind of tooling must not have.
   *
   * /_vercel is the third one, and it was missing — which is why Web Analytics
   * showed nothing. The script is `/_vercel/insights/script.js` and loads fine,
   * because the exclusion for file extensions happens to cover it; the beacon
   * it posts to is `/_vercel/insights/event`, which has no dot in it, so every
   * pageview was redirected to /en/_vercel/insights/event and dropped. Enabling
   * the feature in the dashboard could never have fixed it.
   *
   * The two named paths are the exception to the file-extension rule, and they
   * are here for the rewrites rather than for negotiation. A crawler on a
   * customer's own domain asks for `/sitemap.xml`; without this the proxy never
   * runs, the request is not rewritten onto that customer's site, and the
   * answer is whatever the app itself has at that path — Brandora's sitemap on
   * someone else's domain. The proxy hands both straight through on the app's
   * own host; see the note beside that check.
   */
  matcher: [
    '/sitemap.xml',
    '/robots.txt',
    '/((?!api|monitoring|ingest|_vercel|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}
