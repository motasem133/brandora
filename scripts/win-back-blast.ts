import 'dotenv/config'

import { isEmailConfigured } from '../src/server/email/send'
import { findWinBackCandidates, sweepWinBack } from '../src/server/services/win-back'

/**
 * Sends the win-back email. Dry by default; `--send` delivers.
 *
 *   pnpm win-back:blast            # who would get it
 *   pnpm win-back:blast --send     # send it
 *
 * Against production, run with production's DATABASE_URL, RESEND_API_KEY and
 * NEXT_PUBLIC_APP_URL in the environment — the same way the feedback blast is.
 */

async function main() {
  const send = process.argv.includes('--send')

  const candidates = await findWinBackCandidates()

  console.log(
    `${candidates.length} away for a week or more · email ${
      isEmailConfigured() ? 'configured' : 'NOT configured (nothing will leave)'
    }`,
  )
  for (const c of candidates) {
    console.log(`  ${c.locale}  ${String(c.credits).padStart(3)} cr  ${c.projectId ? 'brand' : '     '}  ${c.email}  ${c.name}`)
  }

  if (!send) {
    console.log('\nDry run. Re-run with --send to deliver.')
    return
  }

  const result = await sweepWinBack()
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
