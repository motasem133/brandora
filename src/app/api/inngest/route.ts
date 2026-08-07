import { serve } from 'inngest/next'

import { inngest } from '@/server/inngest/client'
import { generateBrand, releaseStuckHolds } from '@/server/inngest/generate'

/**
 * The kit's photography step runs three image generations in parallel, each
 * about two and a half minutes. The platform default is 300s; saying so here
 * means the ceiling is a decision rather than an inherited value that could
 * change under us.
 */
export const maxDuration = 300

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateBrand, releaseStuckHolds],
})
