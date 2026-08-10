'use client'

import { emailOTPClient, organizationClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

/**
 * No `baseURL`, so every call goes to the origin the page was served from.
 *
 * It used to be `NEXT_PUBLIC_APP_URL`, inlined at build time — which is the
 * production domain in every deployed build, including previews. A preview
 * then posted its sign-in to production, from a different origin, and the
 * answer was a browser-blocked request or an `INVALID_ORIGIN`; either way a
 * spinner that never resolved.
 *
 * The app and its API are the same deployment by construction, so the origin
 * the page came from is the correct one everywhere: localhost, the test server
 * on its own port, a preview, and production.
 */
export const authClient = createAuthClient({
  plugins: [emailOTPClient(), organizationClient()],
})

export const { signIn, signUp, signOut, useSession, organization } = authClient
