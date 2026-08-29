/**
 * The name of the cookie that remembers which brand a browser last looked at.
 *
 * It lives in its own module rather than beside the component that writes it,
 * and that is not tidiness. `remember-brand.tsx` is a `'use client'` module, so
 * every one of its exports becomes a client reference when a server component
 * imports it — including a plain string. The auth layout read
 * `cookies().get(BRAND_COOKIE)` with a proxy instead of `"brandora_brand"`, got
 * `undefined`, and silently fell through to the example brand every time. It
 * type-checked, rendered and looked correct, which is exactly how long that
 * would have survived.
 */
export const BRAND_COOKIE = 'brandora_brand'

/** Thirty days, which is longer than anyone's gap between two brands. */
export const BRAND_COOKIE_MAX_AGE = 60 * 60 * 24 * 30
