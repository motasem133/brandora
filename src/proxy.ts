import createIntlMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'

import { routing } from '@/i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

/** Paths that require a session, checked after the locale prefix is stripped. */
const PROTECTED = ['/dashboard', '/onboarding', '/admin']
/** Paths a signed-in user should be bounced away from. */
const GUEST_ONLY = ['/login', '/register', '/forgot-password', '/reset-password']

/** Hostnames that are the app itself rather than a customer's published site. */
const APP_HOSTS = new Set(['localhost', '127.0.0.1'])

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

  if (hostname.endsWith(`.${appHost}`)) {
    return hostname.slice(0, -(appHost.length + 1)) || null
  }

  // `{sub}.localhost` — the development equivalent of a wildcard subdomain.
  if (hostname.endsWith('.localhost')) {
    return hostname.slice(0, -'.localhost'.length) || null
  }

  return null
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

  // A customer subdomain serves that customer's published site, nothing else.
  const subdomain = customerSubdomain(request.headers.get('host'), appHost)
  if (subdomain) {
    return NextResponse.rewrite(new URL(`/sites/${subdomain}${pathname}`, request.url))
  }

  /*
   * Published sites are the customer's own pages, not part of the Brandora app.
   * They carry no locale prefix, so locale negotiation must not touch them —
   * otherwise /sites/acme redirects to /en/sites/acme and 404s.
   */
  if (pathname.startsWith('/sites')) {
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
  const isGuestOnly = GUEST_ONLY.some((p) => pathWithoutLocale.startsWith(p))

  if (isProtected && !hasSessionCookie) {
    const url = new URL(`/${locale}/login`, request.url)
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  if (isGuestOnly && hasSessionCookie) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url))
  }

  return intlMiddleware(request)
}

export const config = {
  // Skip API routes, static assets, and anything with a file extension.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
