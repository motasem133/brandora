import 'server-only'

import { sql } from 'drizzle-orm'

import { env } from '@/lib/env'
import { db } from '@/server/db'
import { projectEmails } from '@/server/db/schema'
import { sendEmail } from '@/server/email/send'

/**
 * The one reminder a finished brand earns.
 *
 * Two days after a run that worked, to someone who has not come back to it and
 * has not bought a plan. One email per project, ever.
 *
 * ## What "has not returned" means here
 *
 * Nothing in this product records a page view, and adding that would put a
 * database write on every load of the project page — a hot path that was
 * deliberately tuned down to a single round trip. So "returned" is read from
 * what a person actually *did*, which is a slightly narrower question than
 * whether they looked:
 *
 *  - started another run (regenerated logos, built the kit)
 *  - wrote content for the brand, or talked to the assistant
 *  - published the site
 *  - edited the project or its branding more than a couple of minutes after the
 *    run finished
 *
 * The grace on that last pair is not arbitrary. The pipeline itself writes to
 * `projects` and `branding_assets` as it completes, so their `updated_at` lands
 * on top of the run's own finish time; without a margin every project would
 * look edited the instant it was generated and nobody would ever be emailed.
 * Two minutes clears the pipeline's trailing writes and is short enough that a
 * customer who stayed on the page and chose a logo still counts as engaged.
 *
 * The gap this leaves is someone who opened the project, read it, and did
 * nothing — they are counted as absent and will get the email. For a message
 * whose whole content is "come and look at this", that is the acceptable
 * direction to be wrong in.
 */

/** How long after the run finishes the reminder is due. */
const NUDGE_AFTER_HOURS = 48

/**
 * How long the reminder stays worth sending.
 *
 * Without a ceiling, the first run of this job would email every customer who
 * has ever generated a brand and drifted away — months of backlog delivered in
 * one morning, which is a spam complaint rather than a re-engagement campaign.
 * A brand that has sat untouched for two weeks is not waiting for a nudge.
 */
const NUDGE_BEFORE_DAYS = 14

/** Clears the pipeline's own trailing writes. See the note above. */
const PIPELINE_SETTLE_MINUTES = 2

export type NudgeCandidate = {
  projectId: string
  brand: string
  email: string
  locale: 'en' | 'ar'
}

/**
 * Projects whose owner should hear from us, and has not already.
 *
 * One statement rather than a fan-out of per-project checks: this runs on a
 * schedule over the whole table, and asking six questions per project in
 * JavaScript would be six queries times however many brands exist.
 *
 * The `not exists` against `project_emails` is a filter, not the guard — the
 * guard is the unique index, claimed in `sendBrandNudges` before the send. This
 * only keeps the candidate list from growing without bound as sends accumulate.
 */
export async function findNudgeCandidates(limit = 200): Promise<NudgeCandidate[]> {
  const rows = await db.execute<{
    project_id: string
    brand: string
    email: string
    locale: 'en' | 'ar'
  }>(sql`
    WITH first_run AS (
      SELECT DISTINCT ON (j.project_id)
             j.project_id,
             j.finished_at
      FROM generation_jobs j
      WHERE j.status = 'completed' AND j.finished_at IS NOT NULL
      ORDER BY j.project_id, j.finished_at ASC
    )
    SELECT p.id            AS project_id,
           COALESCE(NULLIF(p.business_name, ''), p.title) AS brand,
           u.email         AS email,
           u.locale        AS locale
    FROM first_run r
    JOIN projects p       ON p.id = r.project_id
    JOIN users u          ON u.id = p.created_by
    WHERE p.deleted_at IS NULL
      AND u.status = 'active'
      /* Verified only. An unverified address is one we have never successfully
         delivered to, and a re-engagement email is the worst possible thing to
         send into a mistyped inbox. */
      AND u.email_verified = true
      AND r.finished_at <= now() - make_interval(hours => ${NUDGE_AFTER_HOURS})
      AND r.finished_at >  now() - make_interval(days  => ${NUDGE_BEFORE_DAYS})

      /* Already told. */
      AND NOT EXISTS (
        SELECT 1 FROM project_emails e
        WHERE e.project_id = p.id AND e.kind = 'brand_nudge'
      )

      /* Bought a plan. Only the statuses that actually entitle one — a
         subscription that stopped at a failed charge is not an upgrade, and its
         owner is exactly who this email is for. */
      AND NOT EXISTS (
        SELECT 1 FROM subscriptions s
        WHERE s.organization_id = p.organization_id
          AND s.status IN ('active', 'trialing')
      )

      /* Came back and did something. */
      AND NOT EXISTS (
        SELECT 1 FROM generation_jobs j2
        WHERE j2.project_id = p.id AND j2.created_at > r.finished_at
      )
      AND NOT EXISTS (
        SELECT 1 FROM content_items c
        WHERE c.project_id = p.id AND c.created_at > r.finished_at
      )
      AND NOT EXISTS (
        SELECT 1 FROM assistant_messages m
        JOIN assistant_threads t ON t.id = m.thread_id
        WHERE t.project_id = p.id AND m.role = 'user' AND m.created_at > r.finished_at
      )
      AND NOT EXISTS (
        SELECT 1 FROM website_assets w
        WHERE w.project_id = p.id
          AND w.updated_at > r.finished_at + make_interval(mins => ${PIPELINE_SETTLE_MINUTES})
      )
      AND p.updated_at <= r.finished_at + make_interval(mins => ${PIPELINE_SETTLE_MINUTES})
      AND NOT EXISTS (
        SELECT 1 FROM branding_assets b
        WHERE b.project_id = p.id
          AND b.updated_at > r.finished_at + make_interval(mins => ${PIPELINE_SETTLE_MINUTES})
      )
    ORDER BY r.finished_at ASC
    LIMIT ${limit}
  `)

  return rows.map((row) => ({
    projectId: row.project_id,
    brand: row.brand,
    email: row.email,
    locale: row.locale === 'ar' ? 'ar' : 'en',
  }))
}

/**
 * Sends the reminder for one project, at most once ever.
 *
 * The row is claimed before the email goes out, and the unique index is what
 * makes that a claim rather than a note: a second caller for the same project
 * — a retried step, two overlapping sweeps — gets a constraint violation,
 * returns false, and sends nothing.
 *
 * Claiming first means a send that then fails at Resend still burns the one
 * attempt. That is the right way round: the alternative is claiming after a
 * successful send, which leaves the window where the mail is delivered and the
 * process dies before recording it — and emailing a customer twice is a worse
 * outcome than emailing them never. The `delivered` column records which
 * happened, so a systematic failure is visible rather than silent.
 */
export async function sendBrandNudge(candidate: NudgeCandidate): Promise<boolean> {
  const claimed = await db
    .insert(projectEmails)
    .values({ projectId: candidate.projectId, kind: 'brand_nudge' })
    .onConflictDoNothing()
    .returning({ id: projectEmails.id })

  if (claimed.length === 0) return false

  const result = await sendEmail({
    to: candidate.email,
    locale: candidate.locale,
    template: {
      kind: 'brand-nudge',
      brand: candidate.brand,
      url: `${env.NEXT_PUBLIC_APP_URL}/${candidate.locale}/dashboard/projects/${candidate.projectId}`,
    },
  })

  if (result.delivered) {
    await db
      .update(projectEmails)
      .set({ delivered: true })
      .where(sql`${projectEmails.id} = ${claimed[0].id}`)
  }

  return result.delivered
}

/** Runs the whole sweep. Safe to run as often as the schedule likes. */
export async function sweepBrandNudges() {
  const candidates = await findNudgeCandidates()

  let sent = 0
  for (const candidate of candidates) {
    if (await sendBrandNudge(candidate)) sent += 1
  }

  if (candidates.length > 0) {
    console.info(`[nudge] ${sent}/${candidates.length} brand reminders delivered`)
  }

  return { found: candidates.length, sent }
}
