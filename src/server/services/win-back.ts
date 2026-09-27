import 'server-only'

import { sql } from 'drizzle-orm'

import { env } from '@/lib/env'
import { db } from '@/server/db'
import { userEmails } from '@/server/db/schema'
import { sendEmail } from '@/server/email/send'
import { FEEDBACK_CODE, FEEDBACK_PERCENT, replyAddress } from '@/server/services/feedback-request'

/**
 * One email to everyone who signed up, used the product, and has not been back.
 *
 * The shape is `feedback-request`'s: a broadcast run by hand from
 * `scripts/win-back-blast.ts`, claimed in `user_emails` before the send so a
 * second run reaches only whoever the first one missed, paced under Resend's
 * rate limit, and carrying `List-Unsubscribe` because nobody asked for it.
 *
 * What it says is the one true, specific thing the database knows about each
 * person: how many credits are still sitting on their account. Free credits are
 * granted once and never expire, so every dormant account has some — and a
 * number is a reason to open the page where "we miss you" is not.
 */

/** Signed in more recently than this and there is nobody to win back. */
const AWAY_FOR_DAYS = 7

export type WinBackCandidate = {
  userId: string
  name: string
  email: string
  locale: 'en' | 'ar'
  credits: number
  /** The newest finished brand, when there is one to come back to. */
  projectId: string | null
}

export async function findWinBackCandidates(limit = 500): Promise<WinBackCandidate[]> {
  const rows = await db.execute<{
    id: string
    name: string
    email: string
    locale: 'en' | 'ar'
    credits: number
    project_id: string | null
  }>(sql`
    SELECT u.id, u.name, u.email, u.locale,
           coalesce((
             SELECT max(o.credit_balance)
             FROM members m JOIN organizations o ON o.id = m.organization_id
             WHERE m.user_id = u.id
           ), 0)::int AS credits,
           (
             SELECT p.id FROM projects p
             WHERE p.created_by = u.id AND p.status = 'completed' AND p.deleted_at IS NULL
             ORDER BY p.created_at DESC LIMIT 1
           ) AS project_id
    FROM users u
    WHERE u.email_verified = true
      AND u.status = 'active'
      AND u.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM user_emails e WHERE e.user_id = u.id AND e.kind = 'win_back'
      )
      /* Used the account at least once, and not lately. */
      AND EXISTS (SELECT 1 FROM sessions s WHERE s.user_id = u.id)
      AND NOT EXISTS (
        SELECT 1 FROM sessions s
        WHERE s.user_id = u.id AND s.created_at > now() - make_interval(days => ${AWAY_FOR_DAYS})
      )
    ORDER BY u.created_at ASC
    LIMIT ${limit}
  `)

  return rows.map((row) => ({
    userId: row.id,
    name: row.name,
    email: row.email,
    locale: row.locale === 'ar' ? 'ar' : 'en',
    credits: Number(row.credits),
    projectId: row.project_id,
  }))
}

/** Mails one person, at most once ever. Claimed before the send — see `brand-nudge`. */
export async function sendWinBack(candidate: WinBackCandidate): Promise<boolean> {
  const claimed = await db
    .insert(userEmails)
    .values({ userId: candidate.userId, kind: 'win_back' })
    .onConflictDoNothing()
    .returning({ id: userEmails.id })

  if (claimed.length === 0) return false

  const base = `${env.NEXT_PUBLIC_APP_URL}/${candidate.locale}/dashboard`

  const result = await sendEmail({
    to: candidate.email,
    locale: candidate.locale,
    template: {
      kind: 'win-back',
      name: candidate.name,
      credits: candidate.credits,
      hasBrand: candidate.projectId !== null,
      url: candidate.projectId ? `${base}/projects/${candidate.projectId}` : base,
      code: FEEDBACK_CODE,
      percent: FEEDBACK_PERCENT,
    },
    headers: {
      'List-Unsubscribe': `<mailto:${replyAddress()}?subject=unsubscribe>`,
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

// ponytail: fixed pace under Resend's 2/s, same as the feedback blast.
const PACE_MS = 600

export async function sweepWinBack(limit?: number) {
  const candidates = await findWinBackCandidates(limit)

  let sent = 0
  for (const [index, candidate] of candidates.entries()) {
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, PACE_MS))
    if (await sendWinBack(candidate)) sent += 1
  }

  return { found: candidates.length, sent }
}
