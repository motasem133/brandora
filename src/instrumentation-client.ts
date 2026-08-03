import * as Sentry from '@sentry/nextjs'

import { initSentry } from '@/lib/observability'

/**
 * Browser-side initialisation. Next loads this file before hydration, which is
 * early enough to catch an error thrown during it.
 */
initSentry('browser')

/** Attributes an error to the navigation that was in flight when it happened. */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
