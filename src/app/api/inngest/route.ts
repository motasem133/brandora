import { serve } from 'inngest/next'

import { inngest } from '@/server/inngest/client'
import { generateRenderedContent } from '@/server/inngest/content'
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
/*
 * `sendBrandNudges` is deliberately not in this list yet.
 *
 * It is built, tested and reviewable — see `services/brand-nudge` — but the
 * moment it is registered it starts mailing real customers on a daily schedule,
 * and an email is the one thing in this product that cannot be taken back. It
 * stays out until its copy has been read and the rule it uses for "has not
 * returned" has been agreed, because that rule decides who hears from us.
 *
 * Turning it on is importing `sendBrandNudges` from `@/server/inngest/nudge`
 * and adding it to the list below. `project_emails` ships in this change, so
 * there is no migration left to sequence behind it.
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateBrand, generateRenderedContent],
})
