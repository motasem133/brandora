import 'dotenv/config'

import { sql } from 'drizzle-orm'

import { db } from '../src/server/db'
import { sessions, userEmails, users } from '../src/server/db/schema'
import { renderEmail } from '../src/server/email/templates'
import {
  FEEDBACK_CODE,
  FEEDBACK_PERCENT,
  findFeedbackCandidates,
} from '../src/server/services/feedback-request'

/**
 * Who the feedback campaign reaches, and what it says when it gets there.
 *
 * This is the only email Brandora sends that nobody asked for, to everybody at
 * once, from a domain with almost no sending history. Every condition in the
 * candidate rule is therefore a decision about a real inbox, and getting one
 * wrong is not recoverable — a broadcast cannot be unsent. So the rule is
 * tested against the real database rather than read.
 *
 * The render half is here for a smaller reason: the discount code is the one
 * thing in the message a reader has to retype, and a code that is missing,
 * misspelled, or reversed by the Arabic layout is an email that costs money to
 * send and delivers nothing.
 *
 * Run: pnpm test:feedback
 */

const PREFIX = 'feedback-test'
const id = (name: string) => `${PREFIX}-${name}`
const email = (name: string) => `${PREFIX}-${name}@example.invalid`

type Case = {
  name: string
  verified?: boolean
  session?: boolean
  alreadyAsked?: boolean
  status?: 'active' | 'suspended'
  deleted?: boolean
  expected: boolean
  because: string
}

const CASES: Case[] = [
  {
    name: 'customer',
    verified: true,
    expected: true,
    because: 'verified, active, has signed in — the person this is written for',
  },
  {
    name: 'never-generated',
    verified: true,
    expected: true,
    because:
      'signed up, looked around, built nothing — the most useful answer in the table, so no run is required',
  },
  {
    name: 'unverified',
    expected: false,
    because: 'an address we have never proved we can reach',
  },
  {
    name: 'never-signed-in',
    verified: true,
    session: false,
    expected: false,
    because: 'typed into the sign-up form and never used',
  },
  {
    name: 'already-asked',
    verified: true,
    alreadyAsked: true,
    expected: false,
    because: 'one ask per account, ever',
  },
  {
    name: 'suspended',
    verified: true,
    status: 'suspended',
    expected: false,
    because: 'a suspended account is not being offered a discount',
  },
  {
    name: 'deleted',
    verified: true,
    deleted: true,
    expected: false,
    because: 'the account is gone',
  },
]

async function main() {
  await cleanup()

  for (const test of CASES) {
    await db.insert(users).values({
      id: id(test.name),
      name: test.name,
      email: email(test.name),
      emailVerified: test.verified ?? false,
      status: test.status ?? 'active',
      deletedAt: test.deleted ? new Date() : null,
    })

    if (test.session !== false) {
      await db.insert(sessions).values({
        id: id(test.name),
        token: id(test.name),
        userId: id(test.name),
        expiresAt: new Date(Date.now() + 86_400_000),
      })
    }

    if (test.alreadyAsked) {
      await db.insert(userEmails).values({ userId: id(test.name), kind: 'feedback_request' })
    }
  }

  const failures: string[] = []

  try {
    const found = await findFeedbackCandidates(500)
    const picked = new Set(found.map((row) => row.email))

    for (const test of CASES) {
      const was = picked.has(email(test.name))
      if (was !== test.expected) {
        failures.push(
          test.expected
            ? `${test.name} was skipped and should have been asked — ${test.because}`
            : `${test.name} would be mailed and must not be — ${test.because}`,
        )
      }
    }
  } finally {
    await cleanup()
  }

  /* The code survives both locales, and the Arabic card does not reverse it. */
  for (const locale of ['en', 'ar'] as const) {
    const { subject, html } = renderEmail(
      {
        kind: 'feedback-request',
        name: 'Sara',
        url: 'mailto:hello@example.com',
        code: FEEDBACK_CODE,
        percent: FEEDBACK_PERCENT,
      },
      locale,
    )

    if (!subject.trim()) failures.push(`${locale}: no subject`)
    if (!html.includes(FEEDBACK_CODE)) failures.push(`${locale}: the code is not in the email`)
    if (!html.includes(`${FEEDBACK_PERCENT}%`)) failures.push(`${locale}: the discount is not stated`)
    if (!html.includes('List-Unsubscribe') && !/stop|إيقاف/.test(html)) {
      failures.push(`${locale}: no way to opt out`)
    }
    if (!html.includes(`dir="ltr"`)) failures.push(`${locale}: the code is not pinned left-to-right`)
  }

  if (failures.length) {
    console.error(`✗ ${failures.length} failed:`)
    for (const failure of failures) console.error(`  - ${failure}`)
    process.exitCode = 1
    return
  }

  console.log(
    `✓ the ask reaches ${CASES.filter((c) => c.expected).length} of ${CASES.length} cases and only those, and carries ${FEEDBACK_CODE} in both locales`,
  )
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
