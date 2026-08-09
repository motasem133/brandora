import { sweepStuckHolds } from '@/server/services/stuck-holds'

/**
 * Returns credits that were taken for work that never ran.
 *
 * Driven by a Vercel cron (see `vercel.json`) rather than by Inngest, because
 * the job this cleans up after is precisely a job Inngest failed to deliver —
 * see `services/stuck-holds.ts` for the incident that moved it here.
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
