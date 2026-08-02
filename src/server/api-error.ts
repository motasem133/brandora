import 'server-only'

import { isAppError } from '@/lib/errors'

/**
 * Turns a thrown error into a Response for Route Handlers.
 *
 * Server Actions get this from next-safe-action's `handleServerError`, but
 * Route Handlers have no equivalent — so an AppError thrown by `requireOrg`
 * escapes as an unhandled exception and Next answers 500. A missing session
 * reported as "server error" is both wrong and misleading: it tells the caller
 * to retry when they need to sign in, and it hides real faults in the noise.
 */
export function toErrorResponse(error: unknown): Response {
  if (isAppError(error)) {
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    )
  }

  console.error('[api] unhandled route error', error)
  return Response.json({ error: { code: 'INTERNAL' } }, { status: 500 })
}
