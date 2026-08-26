import 'dotenv/config'

import { isEmailConfigured } from '../src/server/email/send'
import {
  FEEDBACK_CODE,
  FEEDBACK_PERCENT,
  findFeedbackCandidates,
  sweepFeedbackRequests,
} from '../src/server/services/feedback-request'

/**
 * Sends the feedback campaign.
 *
 * By hand, because it is a one-off: a cron for a message that goes out once
 * would be a schedule that fires forever to do nothing. Safe to re-run — the
 * claim in `user_emails` means a second pass only reaches whoever the first one
 * missed.
 *
 * Dry by default. It prints who would be mailed and stops; `--send` is what
 * actually delivers. The difference between those two words is a few hundred
 * emails to real customers that cannot be recalled, so the destructive one is
 * the one you have to type.
 *
 *   pnpm feedback:blast            # who would get it
 *   pnpm feedback:blast --send     # send it
 *
 * Against production, that means running it with production's DATABASE_URL and
 * RESEND_API_KEY in the environment — the same way the seed is run.
 */

async function main() {
  const send = process.argv.includes('--send')

  const candidates = await findFeedbackCandidates()

  console.log(
    `${candidates.length} to ask · ${FEEDBACK_PERCENT}% off with ${FEEDBACK_CODE} · email ${
      isEmailConfigured() ? 'configured' : 'NOT configured (nothing will leave)'
    }`,
  )
  for (const candidate of candidates) {
    console.log(`  ${candidate.locale}  ${candidate.email}  ${candidate.name}`)
  }

  if (!send) {
    console.log('\nDry run. Re-run with --send to deliver.')
    return
  }

  const result = await sweepFeedbackRequests()
  console.log(`\n✓ ${result.sent}/${result.found} delivered`)

  if (result.sent < result.found) {
    console.log('  The rest are claimed but undelivered — see user_emails.delivered.')
  }
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error)
    process.exit(1)
  },
)
