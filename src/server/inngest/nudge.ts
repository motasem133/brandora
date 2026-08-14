import { cron } from 'inngest'

import { sweepBrandNudges } from '@/server/services/brand-nudge'
import { inngest } from './client'

/**
 * The daily pass that reminds people about a brand they left behind.
 *
 * An Inngest cron rather than a Vercel one, which is the opposite of the choice
 * `stuck-holds` made — and for the reason that made it. The sweeper had to run
 * when Inngest was unreachable, because that was the failure it existed to
 * clean up after; hanging it from Inngest hung the safety net from the thing it
 * was insuring against. Nothing of the kind applies here. If Inngest is down,
 * this email is late, and a re-engagement reminder being late costs nobody
 * anything. Inngest also has no schedule floor, where the Vercel plan allows
 * daily at best.
 *
 * 09:00 UTC: late morning in the Gulf, early morning in Europe, so it lands in
 * a working day for most of the two regions this product actually sells to
 * rather than overnight.
 *
 * The whole sweep is one step. Its work is one query and a handful of sends,
 * each of which is independently idempotent through the unique claim in
 * `sendBrandNudge` — so an Inngest retry of this step re-reads the candidates,
 * finds the claimed ones gone, and sends only what it missed.
 */
export const sendBrandNudges = inngest.createFunction(
  {
    id: 'send-brand-nudges',
    triggers: [cron('0 9 * * *')],
    /* One attempt beyond the first. The claim is what makes a retry safe, and
       a reminder that misses a day is sent tomorrow instead. */
    retries: 1,
  },
  async ({ step }) => {
    return step.run('sweep', () => sweepBrandNudges())
  },
)
