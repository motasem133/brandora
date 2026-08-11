import 'dotenv/config'

import assert from 'node:assert/strict'
import { eq } from 'drizzle-orm'

import { mustVerifyEmail, writeLedgerEntry } from '../src/server/billing/credits'
import { db } from '../src/server/db'
import { organizations } from '../src/server/db/schema'
import { FREE_STARTING_CREDITS } from '../src/server/services/organizations'

/**
 * Where the verification gate stands: after the first run, not before it.
 *
 * The question `mustVerifyEmail` answers is not "has this organization any
 * ledger rows" — a signup grant is a row, and it arrives before anyone has done
 * anything. It is "has a run been delivered", and the case that separates the
 * two definitions is a first run that failed: reserved, then refunded, netting
 * zero. Getting that wrong charges a customer their one free look for a run
 * they never received, which is the exact failure this change exists to remove.
 *
 * It creates its own organization and deletes it at the end, so it is safe
 * against a database with real data in it.
 *
 * Usage: pnpm test:verification
 */

const org = {
  id: crypto.randomUUID(),
  name: 'Verification gate fixture',
  slug: `verification-gate-${crypto.randomUUID().slice(0, 8)}`,
  creditBalance: 0,
}

let failures = 0
function check(name: string, passed: boolean) {
  console[passed ? 'log' : 'error'](`${passed ? '✓' : '✗'} ${name}`)
  if (!passed) failures++
}

/** One ledger row, with an id that cannot collide with another run's. */
function move(amount: number, reason: 'subscription_grant' | 'generation' | 'refund') {
  return writeLedgerEntry({
    organizationId: org.id,
    amount,
    reason,
    idempotencyKey: `${reason}:${crypto.randomUUID()}`,
  })
}

async function main() {
  try {
    await db.insert(organizations).values(org)
    await move(FREE_STARTING_CREDITS, 'subscription_grant')

    check('a fresh account may run once unverified', !(await mustVerifyEmail(org.id, false)))

    await move(-8, 'generation')

    check('having run once, an unverified account is gated', await mustVerifyEmail(org.id, false))
    check('a confirmed address is never gated', !(await mustVerifyEmail(org.id, true)))

    /* The run failed and the credits went straight back, so it was never had. */
    await move(8, 'refund')

    check('a refunded run does not count as the first run', !(await mustVerifyEmail(org.id, false)))

    /* A partial run — some sections delivered, the rest refunded — is a run. */
    await move(-8, 'generation')
    await move(6, 'refund')

    check('a partly delivered run counts', await mustVerifyEmail(org.id, false))
  } finally {
    await db.delete(organizations).where(eq(organizations.id, org.id))
  }

  assert.equal(failures, 0, `${failures} verification-gate case(s) failed`)
  console.log('✓ the gate falls after the first delivered run, and only then')
  process.exit(0)
}

main()
