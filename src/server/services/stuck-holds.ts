import 'server-only'

import { and, eq, inArray, isNull, lt, or, sql } from 'drizzle-orm'

import { settleCredits, settleForContent } from '@/server/billing/credits'
import { db } from '@/server/db'
import { findStuckContent } from '@/server/db/queries/content'
import { contentItems, generationJobs, projects } from '@/server/db/schema'

/**
 * Giving back credits that were taken for work that never happened.
 *
 * This lives outside the Inngest module on purpose, and the reason is a real
 * incident rather than a preference. The sweeper used to be an Inngest cron —
 * which meant the safety net hung from the very thing it was insuring against.
 * When no Inngest app was synced to production, two customers' runs sat at
 * `queued` forever, and the function that would have refunded them never ran
 * either, because it was waiting on the same broken delivery. Their credits
 * were gone and nothing in the product could notice.
 *
 * So the sweep is plain code now, and the schedule that drives it is a Vercel
 * cron hitting an ordinary route — the same machinery that serves the app. If
 * that is broken the site is down, which is a problem that announces itself.
 */

/** A queued job that never started. Generation begins within seconds. */
const NEVER_STARTED_MINUTES = 10

/**
 * A job that started and stopped reporting. The longest honest run observed is
 * about four minutes; erring long is deliberate, because refunding a run that
 * is merely slow hands back credits while the work is still being paid for
 * downstream.
 */
const STALLED_MINUTES = 90

/**
 * Releases the hold on one job.
 *
 * `settleCredits` is keyed on the job id, so this and the pipeline's own
 * `settle` step cannot both refund — whichever runs first wins and the other is
 * a no-op. That makes this safe to call on a failure that happened *after* a
 * successful settle.
 */
export async function releaseHold(
  jobId: string,
  organizationId: string,
  projectId: string,
  reason: string,
) {
  const [job] = await db.select().from(generationJobs).where(eq(generationJobs.id, jobId)).limit(1)
  if (!job) return

  await settleCredits({
    organizationId,
    reserved: job.creditsReserved,
    // Nothing finished, so nothing is charged. A run that got far enough to
    // complete a section will have settled honestly already, and the
    // idempotency key makes this call fall through.
    used: 0,
    projectId,
    generationJobId: jobId,
  })

  await db
    .update(generationJobs)
    .set({ status: 'failed', creditsCharged: 0, error: reason, finishedAt: new Date() })
    .where(eq(generationJobs.id, jobId))

  // `failed` rather than left as it was: it is what lets the customer press
  // the button again, because `startGeneration` refuses to run over a project
  // that still reads as queued or generating.
  await db.update(projects).set({ status: 'failed' }).where(eq(projects.id, projectId))
}

/** Generation jobs that have taken credits and stopped reporting. */
export async function findStuckJobs() {
  return db
    .select({
      id: generationJobs.id,
      projectId: generationJobs.projectId,
      organizationId: projects.organizationId,
      startedAt: generationJobs.startedAt,
    })
    .from(generationJobs)
    .innerJoin(projects, eq(projects.id, generationJobs.projectId))
    .where(
      and(
        inArray(generationJobs.status, ['queued', 'running']),
        or(
          /*
           * Two clocks, because these are two different failures.
           *
           * A job with no `started_at` was never delivered to a worker at all —
           * ten minutes is already far past the seconds it normally takes, and
           * waiting an hour and a half to notice means a customer watches a
           * spinner for that long with their credits gone. A job that did start
           * gets the long benefit of the doubt.
           */
          and(
            isNull(generationJobs.startedAt),
            lt(
              generationJobs.createdAt,
              sql`now() - make_interval(mins => ${NEVER_STARTED_MINUTES})`,
            ),
          ),
          lt(generationJobs.createdAt, sql`now() - make_interval(mins => ${STALLED_MINUTES})`),
        ),
      ),
    )
    .limit(100)
}

/**
 * Returns every hold that is owed back, for both generation and content.
 *
 * Safe to run as often as you like: every refund is idempotent on its own key,
 * so a second sweep over the same rows changes nothing.
 */
export async function sweepStuckHolds() {
  const jobs = await findStuckJobs()

  for (const job of jobs) {
    await releaseHold(
      job.id,
      job.organizationId,
      job.projectId,
      job.startedAt
        ? 'The run stopped reporting. Credits were returned automatically.'
        : 'The run never started. Credits were returned automatically.',
    )
    console.warn(`[credits] released a stuck hold on job ${job.id}`)
  }

  /*
   * Content Studio's holds are swept here too rather than by a second schedule.
   * The lesson is the same one, and it is worth having in one place.
   *
   * Fifteen minutes: content generation runs inside a single request under a
   * 60-second timeout, so anything still `generating` a quarter of an hour
   * later is not slow, it is gone.
   */
  const content = await findStuckContent(15)

  for (const item of content) {
    await settleForContent({
      organizationId: item.organizationId,
      reserved: item.creditsReserved,
      used: 0,
      projectId: item.projectId,
      contentItemId: item.id,
    })

    await db
      .update(contentItems)
      .set({
        status: 'failed',
        creditsCharged: 0,
        error: 'The generation never reported back. Credits were returned automatically.',
        updatedAt: new Date(),
      })
      .where(eq(contentItems.id, item.id))

    console.warn(`[credits] released a stuck hold on content ${item.id}`)
  }

  return { jobs: jobs.length, content: content.length }
}
