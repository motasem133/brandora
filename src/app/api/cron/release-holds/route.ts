import { sweepStuckHolds } from '@/server/services/stuck-holds'

/**
 * Returns credits that were taken for work that never ran.
 *
 * Driven by a Vercel cron rather than by Inngest, because the job this cleans
 * up after is precisely a job Inngest failed to deliver — see
 * `services/stuck-holds.ts` for the incident that moved it here.
 *
 * The schedule in `vercel.json` is daily, which is the most this plan allows;
 * a shorter one is rejected at deploy time rather than at runtime. That is
 * survivable because this is the backstop and not the main path: a customer
 * watching their own run has the hold released by the progress stream within
 * seconds, and pressing generate again releases it too. What is left for this
 * is the holds nobody is waiting on — someone who closed the tab and went to
 * bed. If the plan ever allows it, every fifteen minutes is the right value.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  /*
   * Vercel signs its cron requests with this header. The check is skipped only
   * when no secret is configured, so that a deployment without it still gets
   * the refunds rather than silently keeping customers' credits — the failure
   * this endpoint exists for is the one where nothing runs at all.
   */
  const secret = process.env.CRON_SECRET

  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const released = await sweepStuckHolds()

  if (released.jobs || released.content) {
    console.warn(`[credits] sweep released ${released.jobs} jobs and ${released.content} content holds`)
  }

  return Response.json({ ok: true, released })
}
