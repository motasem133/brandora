import 'dotenv/config'

import { sql } from 'drizzle-orm'

import { db } from '../src/server/db'
import { sessions, userEmails, users } from '../src/server/db/schema'
import { renderEmail } from '../src/server/email/templates'
import { findWinBackCandidates } from '../src/server/services/win-back'

/**
 * Who the win-back email reaches, and that the message carries what it claims.
 *
 * The rule that matters beyond the feedback campaign's is the recency one: a
 * person who signed in this week is not away, and "come back" to them is noise.
 *
 * Run: pnpm test:win-back
 */

const PREFIX = 'win-back-test'
const id = (name: string) => `${PREFIX}-${name}`
const email = (name: string) => `${PREFIX}-${name}@example.invalid`

const CASES = [
  { name: 'away', sessionAgeDays: 30, expected: true, because: 'used it once, a month ago' },
  { name: 'here-this-week', sessionAgeDays: 2, expected: false, because: 'signed in two days ago; not away' },
  { name: 'never-signed-in', sessionAgeDays: null, expected: false, because: 'typed into the form and never used' },
  { name: 'already-sent', sessionAgeDays: 30, sent: true, expected: false, because: 'one email per account, ever' },
  { name: 'unverified', sessionAgeDays: 30, verified: false, expected: false, because: 'never proved reachable' },
] as const

async function main() {
  await cleanup()

  for (const test of CASES) {
    await db.insert(users).values({
      id: id(test.name),
      name: test.name,
      email: email(test.name),
      emailVerified: 'verified' in test ? test.verified : true,
    })
    if (test.sessionAgeDays !== null) {
      await db.insert(sessions).values({
        id: id(test.name),
        token: id(test.name),
        userId: id(test.name),
        createdAt: new Date(Date.now() - test.sessionAgeDays * 86_400_000),
        expiresAt: new Date(Date.now() + 86_400_000),
      })
    }
    if ('sent' in test) await db.insert(userEmails).values({ userId: id(test.name), kind: 'win_back' })
  }

  const failures: string[] = []
  try {
    const picked = new Set((await findWinBackCandidates(500)).map((row) => row.email))
    for (const test of CASES) {
      if (picked.has(email(test.name)) !== test.expected) {
        failures.push(`${test.name}: ${test.expected ? 'skipped' : 'would be mailed'} — ${test.because}`)
      }
    }
  } finally {
    await cleanup()
  }

  for (const locale of ['en', 'ar'] as const) {
    for (const hasBrand of [true, false]) {
      const { subject, html } = renderEmail(
        { kind: 'win-back', name: 'Sara', credits: 3, hasBrand, url: 'https://example.com', code: 'BRANDORA', percent: 10 },
        locale,
      )
      const tag = `${locale}/${hasBrand ? 'brand' : 'no brand'}`
      if (!subject.includes('3')) failures.push(`${tag}: the credit count is not in the subject`)
      if (!html.includes('BRANDORA')) failures.push(`${tag}: the code is not in the email`)
      if (!html.includes('10%')) failures.push(`${tag}: the discount is not stated`)
      if (!/stop|إيقاف/.test(html)) failures.push(`${tag}: no way to opt out`)
    }
  }

  if (failures.length) {
    console.error(`✗ ${failures.length} failed:`)
    for (const failure of failures) console.error(`  - ${failure}`)
    process.exitCode = 1
    return
  }
  console.log(`✓ reaches ${CASES.filter((c) => c.expected).length} of ${CASES.length} cases and only those; renders in both locales`)
}

async function cleanup() {
  await db.delete(users).where(sql`${users.id} LIKE ${PREFIX + '%'}`)
}

main().then(
  () => process.exit(process.exitCode ?? 0),
  (error) => {
    console.error(error)
    process.exit(1)
  },
)
