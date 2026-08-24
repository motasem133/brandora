import 'dotenv/config'

import { sql } from 'drizzle-orm'

import { db } from '../src/server/db'
import { sessions, userEmails, users } from '../src/server/db/schema'
import { findVerifyReminderCandidates } from '../src/server/services/verify-reminder'

/**
 * Who the one verification reminder is owed to.
 *
 * The candidate rule is a single SQL statement with five conditions, and every
 * one of them is a decision about mailing a real person: too loose and the
 * first run of this job mails a fortnight of drifted sign-ups in one batch from
 * a domain with no sending history, too tight and it never fires at all. Both
 * failures are invisible until they have already happened, so the rule is
 * tested rather than read.
 *
 * Against the real database, with rows it inserts and removes itself.
 *
 * Run: pnpm test:verify-reminder
 */

const PREFIX = 'verify-reminder-test'
const id = (name: string) => `${PREFIX}-${name}`
const email = (name: string) => `${PREFIX}-${name}@example.invalid`

const HOURS = (n: number) => new Date(Date.now() - n * 60 * 60 * 1000)
const DAYS = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000)

type Case = {
  name: string
  verified?: boolean
  createdAt: Date
  session?: boolean
  alreadyTold?: boolean
  status?: 'active' | 'suspended'
  expected: boolean
  because: string
}

const CASES: Case[] = [
  {
    name: 'drifted',
    createdAt: DAYS(2),
    session: true,
    expected: true,
    because: 'signed up two days ago, signed in, never verified — the case this exists for',
  },
  {
    name: 'verified',
    createdAt: DAYS(2),
    session: true,
    verified: true,
    expected: false,
    because: 'already verified',
  },
  {
    name: 'fresh',
    createdAt: HOURS(2),
    session: true,
    expected: false,
    because: 'two hours old — still in the session that created it',
  },
  {
    name: 'ancient',
    createdAt: DAYS(30),
    session: true,
    expected: false,
    because: 'a month old; a reminder now is archaeology',
  },
  {
    name: 'never-signed-in',
    createdAt: DAYS(2),
    session: false,
    expected: false,
    because: 'an address typed into the form and never used',
  },
  {
    name: 'already-told',
    createdAt: DAYS(2),
    session: true,
    alreadyTold: true,
    expected: false,
    because: 'one reminder per account, ever',
  },
  {
    name: 'suspended',
    createdAt: DAYS(2),
    session: true,
    status: 'suspended',
    expected: false,
    because: 'a suspended account is not being invited back',
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
      createdAt: test.createdAt,
      updatedAt: test.createdAt,
    })

    if (test.session !== false) {
      await db.insert(sessions).values({
        id: id(test.name),
        token: id(test.name),
        userId: id(test.name),
        expiresAt: new Date(Date.now() + 86_400_000),
      })
    }

    if (test.alreadyTold) {
      await db.insert(userEmails).values({ userId: id(test.name), kind: 'verify_reminder' })
    }
  }

  try {
    const found = await findVerifyReminderCandidates(500)
    const picked = new Set(found.map((row) => row.email))
    const failures: string[] = []

    for (const test of CASES) {
      const was = picked.has(email(test.name))
      if (was !== test.expected) {
        failures.push(
          test.expected
            ? `${test.name} was skipped and should have been mailed — ${test.because}`
            : `${test.name} would be mailed and must not be — ${test.because}`,
        )
      }
    }

    if (failures.length) {
      console.error(`✗ ${failures.length} failed:`)
      for (const failure of failures) console.error(`  - ${failure}`)
      process.exitCode = 1
      return
    }

    console.log(`✓ the reminder reaches ${CASES.filter((c) => c.expected).length} of ${CASES.length} cases, and only that one`)
  } finally {
    await cleanup()
  }
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
