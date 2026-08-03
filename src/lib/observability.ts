import * as Sentry from '@sentry/nextjs'

import { isAppError } from '@/lib/errors'

/**
 * Sentry configuration, shared by the browser, the Node server and the edge.
 *
 * One module rather than the three config files the wizard scaffolds, because
 * the policy that matters — what gets dropped — must be identical everywhere.
 * A rule applied on the server but not the client is worse than no rule: it
 * makes the noise look like it only happens in one runtime.
 *
 * Without a DSN every call here is inert, so development and CI behave exactly
 * as they did before Sentry existed.
 */

export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

/**
 * Control-flow "errors" Next throws internally. A redirect is not a fault, and
 * reporting one would bury the real faults under navigation traffic.
 */
const NEXT_CONTROL_FLOW = ['NEXT_REDIRECT', 'NEXT_NOT_FOUND', 'NEXT_HTTP_ERROR_FALLBACK']

function isControlFlow(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest
  return typeof digest === 'string' && NEXT_CONTROL_FLOW.some((code) => digest.startsWith(code))
}

/**
 * Whether an error is worth waking someone up for.
 *
 * `AppError` is the taxonomy of *expected* failures — a missing session, an
 * exhausted credit balance, a locked feature. Those are the product working as
 * designed, and reporting them would drown the unexpected ones. Anything that
 * is not an AppError is, by construction, something nobody planned for.
 */
export function isReportable(error: unknown): boolean {
  return !isAppError(error) && !isControlFlow(error)
}

/** Reports an error that has already been handled, so the request can continue. */
export function reportError(error: unknown, context?: Record<string, unknown>) {
  if (!isReportable(error)) return
  Sentry.captureException(error, context ? { extra: context } : undefined)
}

export function initSentry(runtime: 'browser' | 'node' | 'edge') {
  Sentry.init({
    dsn: SENTRY_DSN,
    // Nothing is sent without a DSN anyway; being explicit keeps the intent
    // readable rather than implied by an absent variable.
    enabled: Boolean(SENTRY_DSN),

    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
    // Ties a stack trace to the commit that produced it.
    release: process.env.VERCEL_GIT_COMMIT_SHA,

    /*
     * Emails, IP addresses and headers stay out by default. Brand briefs and
     * customer contact details pass through nearly every request here, and an
     * error tracker is not where they belong.
     */
    sendDefaultPii: false,

    /*
     * A tenth of traffic is enough to see which routes are slow without paying
     * for a trace of every request. Errors are captured regardless of this.
     */
    tracesSampleRate: 0.1,

    initialScope: { tags: { runtime } },

    beforeSend(event, hint) {
      return isReportable(hint.originalException) ? event : null
    },
  })
}
