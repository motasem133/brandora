import * as Sentry from '@sentry/nextjs'

import { initSentry } from '@/lib/observability'

/**
 * Runs once per runtime, before anything else the app does.
 *
 * Both server runtimes are initialised here rather than from the separate
 * sentry.*.config.ts files the wizard generates, so there is one place to read
 * and one policy to keep in step — see lib/observability.
 */
export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') initSentry('node')
  if (process.env.NEXT_RUNTIME === 'edge') initSentry('edge')
}

/**
 * Catches what never reaches our own handlers: errors thrown while React
 * renders a Server Component, and anything a Route Handler lets escape.
 */
export const onRequestError = Sentry.captureRequestError
