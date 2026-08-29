'use client'

import { useEffect } from 'react'

import { BRAND_COOKIE, BRAND_COOKIE_MAX_AGE } from '@/lib/last-brand'

/**
 * Remembers which brand this browser was last looking at, for the sign-in
 * screen to paint itself with.
 *
 * The threshold has no session — that is the whole point of it — so the only
 * thing that can tell it whose brand to show is something the browser kept.
 * This writes the three facts the specimen panel draws (name, palette, mark)
 * and nothing else: no ids, no counts, no session material, nothing that is not
 * already on the screen the customer is looking at when it is written.
 *
 * A cookie rather than `localStorage` because the reader is a server component.
 * `SameSite=Lax` and no `Secure` in development; it is not a credential and
 * carries no authority — the worst a forged one can do is put somebody else's
 * palette behind a login form.
 *
 * Written from the client rather than from a route handler because a Server
 * Component cannot set a cookie during render, and one `useEffect` is a smaller
 * thing to own than an endpoint whose only job is to echo what the page already
 * rendered. The cookie's name lives in `lib/last-brand` and not here, for the
 * reason recorded there.
 */
export function RememberBrand({ value }: { value: string }) {
  useEffect(() => {
    document.cookie = `${BRAND_COOKIE}=${encodeURIComponent(value)}; path=/; max-age=${BRAND_COOKIE_MAX_AGE}; samesite=lax`
  }, [value])

  return null
}
