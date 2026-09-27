import 'server-only'

import { sql } from 'drizzle-orm'

import { env } from '@/lib/env'
import { db } from '@/server/db'
import { userEmails } from '@/server/db/schema'
import { sendEmail } from '@/server/email/send'

/**
 * The one time the product asks a question instead of announcing something.
 *
 * There is no analytics and no session recording in production, so what
 * customers actually think of Brandora is not knowable from the database — only
 * what they did is. This asks them, once, and pays for the answer with a
 * discount code.
 *
 * It is a broadcast, not a lifecycle email, and that difference is the whole
 * shape of what follows: no schedule, no Inngest function, no window on
 * `created_at`. It is run by hand from `scripts/feedback-blast.ts` when the
 * owner decides to send it, and the unique claim in `user_emails` is what makes
 * running it twice harmless rather than a second email to everybody.
 *
 * ## Who it reaches
 *
 * Verified, active, and has signed in at least once — the same three tests the
 * other two lifecycle emails apply, for the same reasons. An unverified address
 * is one this product has never proved it can reach, and a marketing broadcast
 * into a mistyped inbox is a spam complaint against a domain with no sending
 * history. A row with no session was typed into the sign-up form and never
 * used: a bot or a change of mind, and nothing to learn from either.
 *
 * It does *not* require having generated a brand. Someone who signed up, looked
 * around and left is the most useful person to hear from in the whole table —
 * they are the ones who know what is missing.
 */

/** The campaign's code and its value. One campaign, so both live here. */
export const FEEDBACK_CODE = 'BRANDORA'
export const FEEDBACK_PERCENT = 10

/**
 * Where a reply lands, taken from the sender rather than written down twice.
 *
 * `EMAIL_FROM` is a display-name form — `Brandora <hello@example.com>` — and
 * the button is a `mailto:`, which needs the bare address inside it.
 */
export function replyAddress() {
  return env.EMAIL_FROM.match(/<([^>]+)>/)?.[1] ?? env.EMAIL_FROM
}

export type FeedbackCandidate = {
  userId: string
  name: string
  email: string
  locale: 'en' | 'ar'
}

export async function findFeedbackCandidates(limit = 500): Promise<FeedbackCandidate[]> {
  const rows = await db.execute<{
    id: string
    name: string
    email: string
    locale: 'en' | 'ar'
  }>(sql`
    SELECT u.id, u.name, u.email, u.locale
    FROM users u
    WHERE u.email_verified = true
      AND u.status = 'active'
      AND u.deleted_at IS NULL

      /* Already asked. The guard is the unique index; this only keeps the
         candidate list from shrinking as the blast progresses. */
      AND NOT EXISTS (
        SELECT 1 FROM user_emails e
        WHERE e.user_id = u.id AND e.kind = 'feedback_request'
      )

      /* Used the account at least once. See the note above. */
      AND EXISTS (SELECT 1 FROM sessions s WHERE s.user_id = u.id)
    ORDER BY u.created_at ASC
    LIMIT ${limit}
  `)

  return rows.map((row) => ({
    userId: row.id,
    name: row.name,
    email: row.email,
    locale: row.locale === 'ar' ? 'ar' : 'en',
  }))
}

/**
 * Asks one person, at most once ever.
 *
 * Claimed before the send, like its two siblings, and for the reason set out in
 * `brand-nudge`: a claim written afterwards leaves a window where the mail goes
 * out and the process dies before recording it, and asking the same customer
 * twice is worse than never asking them. `delivered` records which happened.
 */
export async function sendFeedbackRequest(candidate: FeedbackCandidate): Promise<boolean> {
  const claimed = await db
    .insert(userEmails)
    .values({ userId: candidate.userId, kind: 'feedback_request' })
    .onConflictDoNothing()
    .returning({ id: userEmails.id })

  if (claimed.length === 0) return false

  const address = replyAddress()

  const result = await sendEmail({
    to: candidate.email,
    locale: candidate.locale,
    template: {
      kind: 'feedback-request',
      name: candidate.name,
      /* A mailto rather than a form. There is no feedback page in this product,
         and the answer worth having is a sentence someone types without
         leaving their inbox. */
      url: `mailto:${address}?subject=${encodeURIComponent('Brandora feedback')}`,
      code: FEEDBACK_CODE,
      percent: FEEDBACK_PERCENT,
    },
    headers: {
      'List-Unsubscribe': `<mailto:${address}?subject=unsubscribe>`,
    },
  })

  if (result.delivered) {
    await db
      .update(userEmails)
      .set({ delivered: true })
      .where(sql`${userEmails.id} = ${claimed[0].id}`)
  }

  return result.delivered
}

/**
 * Sends the whole campaign.
 *
 * Sequential with a pause, where the other two sweeps send flat out. They mail
 * a handful of people a day; this mails the entire table in one pass, and
 * Resend's default limit is two requests a second. Over that it returns 429 —
 * and because the claim is already written by then, a rate-limited send is a
 * customer who is recorded as asked and never was.
 */
// ponytail: fixed pace, not a token bucket. Revisit if the list outgrows one run.
const PACE_MS = 600

export async function sweepFeedbackRequests(limit?: number) {
  const candidates = await findFeedbackCandidates(limit)

  let sent = 0
  for (const [index, candidate] of candidates.entries()) {
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, PACE_MS))
    if (await sendFeedbackRequest(candidate)) sent += 1
  }

  return { found: candidates.length, sent }
}
