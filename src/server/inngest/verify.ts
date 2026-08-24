import { cron } from 'inngest'

import { sweepVerifyReminders } from '@/server/services/verify-reminder'
import { inngest } from './client'

/**
 * The daily pass that asks an unverified account to finish verifying.
 *
 * Same shape and same reasoning as `sendBrandNudges`, an hour later so the two
 * do not share a minute: an Inngest cron because a late reminder costs nothing,
 * one step because every send inside it is independently claimed, and one
 * retry because a claim makes that safe.
 *
 * 10:00 UTC rather than 09:00 for a second reason as well — an account that
 * signed up yesterday afternoon in the Gulf is twenty hours old by then, which
 * is the window `REMIND_AFTER_HOURS` is set to.
 */
export const sendVerifyReminders = inngest.createFunction(
  {
    id: 'send-verify-reminders',
    triggers: [cron('0 10 * * *')],
    retries: 1,
  },
  async ({ step }) => {
    return step.run('sweep', () => sweepVerifyReminders())
  },
)
