import { serve } from 'inngest/next'

import { inngest } from '@/server/inngest/client'
import { generateRenderedContent } from '@/server/inngest/content'
import { generateBrand } from '@/server/inngest/generate'
import { redrawKitPosts } from '@/server/inngest/logo'
import { sendBrandNudges } from '@/server/inngest/nudge'
import { sendVerifyReminders } from '@/server/inngest/verify'

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
 * `sendBrandNudges` mails real customers on a schedule, and an email is the one
 * thing in this product that cannot be taken back — so it was built, merged and
 * deliberately left out of this list until two things had been settled: its
 * copy, and what "has not returned" means. Both were, on 15 August.
 *
 * It reads "returned" as having *done* something with the brand — another run,
 * content, the assistant, a publish, an edit — rather than as having opened the
 * page, because nothing here records a page view and adding one would put a
 * write on every load of the project page. Someone who looked and did nothing
 * is therefore counted as absent and will hear from us. That was the call.
 *
 * Taking it back out is deleting it from this list; nothing else depends on it.
 * `project_emails` keeps a row per project already written to, so switching it
 * off and on again cannot re-send to anyone who has had it.
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    generateBrand,
    generateRenderedContent,
    redrawKitPosts,
    sendBrandNudges,
    sendVerifyReminders,
  ],
})
