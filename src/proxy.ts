import createIntlMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'

import { routing } from '@/i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

/** Paths that require a session, checked after the locale prefix is stripped. */
const PROTECTED = ['/dashboard', '/onboarding', '/admin']
/** Paths a signed-in user should be bounced away from. */
const GUEST_ONLY = ['/login', '/register', '/forgot-password', '/reset-password']

/**
* Proxy (formerly middleware) handles locale negotiation and *redirects only*.
 *
 * It is deliberately not a security boundary: it reads the session cookie
 * without verifying it, because verification needs a database round trip that
 * would run on every request. Real enforcement lives in `requireSession()` /
 * `orgAction`, which every page and action calls regardless.
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

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
