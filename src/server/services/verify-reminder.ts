import 'server-only'

import { sql } from 'drizzle-orm'

import { auth } from '@/server/auth'
import { db } from '@/server/db'
import { userEmails } from '@/server/db/schema'

/**
 * The one reminder an unverified account ever gets.
 *
 * Three of the last six sign-ups took a free brand and left without verifying,
 * and nothing followed them: the brand nudge — the product's only lifecycle
 * email — requires `email_verified = true`, so precisely the people worth
 * recovering were the ones nothing could write to. An address that never
 * verified is also an address we have never proved we can reach, which is the
 * rule that gate exists for; a *verification* message is the exception, because
 * it is the message that settles the question rather than trading on an answer
 * it does not have.
 *
 * It carries a link rather than a code. A code lives ten minutes, which is the
 * right length for someone sitting in front of the box and the wrong length
 * entirely for a message that arrives while they are asleep. The link flow was
 * never removed — `/verify-email` still honours it — and its lifetime is set
 * beside it in `auth.ts`.
 *
 * One message per account, ever, guaranteed by the unique index rather than by
 * this query. `p=none` on the domain's DMARC and a sender with a short history
 * mean a second attempt would be a deliverability decision, not a copy one.
 */

/** Long enough that someone finishing their first session is not interrupted. */
const REMIND_AFTER_HOURS = 20

/**
 * Past this, a reminder is archaeology.
 *
 * The same reasoning as the brand nudge's ceiling: without one, the first run
 * of this job mails everyone who ever signed up and drifted, in a single batch,
 * which is how a new sender's reputation is destroyed in an afternoon.
 */
const REMIND_BEFORE_DAYS = 14

export type ReminderCandidate = {
  userId: string
  email: string
  locale: 'en' | 'ar'
}

export async function findVerifyReminderCandidates(limit = 100): Promise<ReminderCandidate[]> {
  const rows = await db.execute<{ id: string; email: string; locale: 'en' | 'ar' }>(sql`
    SELECT u.id, u.email, u.locale
    FROM users u
    WHERE u.email_verified = false
      AND u.status = 'active'
      AND u.created_at <= now() - make_interval(hours => ${REMIND_AFTER_HOURS})
      AND u.created_at >  now() - make_interval(days  => ${REMIND_BEFORE_DAYS})

      /* Already told. The guard is the unique index; this only keeps the
         candidate list from growing as sends accumulate. */
      AND NOT EXISTS (
        SELECT 1 FROM user_emails e
        WHERE e.user_id = u.id AND e.kind = 'verify_reminder'
      )

      /*
       * Signed in at least once.
       *
       * A row with no session is an address that was typed into the form and
       * never used — a bot, a typo, or somebody who changed their mind before
       * the page finished. Mailing those is how a sender's complaint rate goes
       * up for no possible gain.
       */
      AND EXISTS (SELECT 1 FROM sessions s WHERE s.user_id = u.id)
    ORDER BY u.created_at ASC
    LIMIT ${limit}
  `)

  return rows.map((row) => ({
    userId: row.id,
    email: row.email,
    locale: row.locale === 'ar' ? 'ar' : 'en',
  }))
}

/**
 * Sends one reminder, at most once ever.
 *
 * The row is claimed before the mail goes out, and the unique index makes that
 * a claim rather than a note. Claiming first means a send that then fails at
 * Resend burns the one attempt — which is the right way round, for the reason
 * `brand-nudge` sets out: mailing someone twice is worse than mailing them
 * never, and `delivered` records which happened.
 *
 * Better Auth owns the token and the mail, through the `sendVerificationEmail`
 * handler already configured. Nothing here knows what is in the link, which is
 * what keeps the reminder from becoming a second implementation of
 * verification that can disagree with the first.
 */
export async function sendVerifyReminder(candidate: ReminderCandidate): Promise<boolean> {
  const claimed = await db
    .insert(userEmails)
    .values({ userId: candidate.userId, kind: 'verify_reminder' })
    .onConflictDoNothing()
    .returning({ id: userEmails.id })

  if (claimed.length === 0) return false

  try {
    await auth.api.sendVerificationEmail({
      body: { email: candidate.email, callbackURL: `/${candidate.locale}/dashboard` },
    })
  } catch (error) {
    console.warn(`[verify] reminder to ${candidate.email} failed`, error)
    return false
  }

  await db
    .update(userEmails)
    .set({ delivered: true })
    .where(sql`${userEmails.id} = ${claimed[0].id}`)

  return true
}

/** Runs the whole sweep. Safe to run as often as the schedule likes. */
export async function sweepVerifyReminders() {
  const candidates = await findVerifyReminderCandidates()

  let sent = 0
  for (const candidate of candidates) {
    if (await sendVerifyReminder(candidate)) sent += 1
  }

  if (candidates.length > 0) {
    console.info(`[verify] ${sent}/${candidates.length} verification reminders sent`)
  }

  return { found: candidates.length, sent }
}
