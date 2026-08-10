import { serve } from 'inngest/next'

import { inngest } from '@/server/inngest/client'
import { generateCarousel } from '@/server/inngest/content'
import { generateBrand } from '@/server/inngest/generate'

/**
 * The kit's photography step runs three image generations in parallel, each
 * about two and a half minutes. The platform default is 300s; saying so here
 * means the ceiling is a decision rather than an inherited value that could
 * change under us.
 */
export const maxDuration = 300

/*
 * The stuck-hold sweeper used to be registered here as a cron. It is a Vercel
 * cron now — a sweeper that only runs when Inngest is reachable is no use for
 * the failure where Inngest is not reachable, which is the failure it exists
 * for. See `services/stuck-holds.ts`.
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateBrand, generateCarousel],
})
