import { getProject } from '@/server/db/queries/projects'
import { getLatestJobForProject } from '@/server/services/generation'
import { isNeverCollected, releaseHold } from '@/server/services/stuck-holds'
import { toErrorResponse } from '@/server/api-error'
import { requireOrg } from '@/server/session'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Server-sent events carrying per-step generation progress.
 *
 * The handler tails `generation_jobs.progress`, which the Inngest worker writes
 * after each step. Polling the database rather than using pub/sub is deliberate:
 * the job row is already the source of truth, the read is a single indexed
 * lookup, and it keeps working when the worker and the web request are on
 * different machines. Swap in Redis only if concurrent jobs reach the hundreds.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    return await handle(params)
  } catch (error) {
    return toErrorResponse(error)
  }
}

async function handle(params: Promise<{ projectId: string }>) {
  const { projectId } = await params

  // Route handlers are not covered by the action middleware, so the tenant
  // check has to happen here explicitly.
  const { org } = await requireOrg()
  const project = await getProject(org.id, projectId)

  if (!project) {
    return new Response(JSON.stringify({ error: { code: 'NOT_FOUND' } }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const encoder = new TextEncoder()
  let interval: ReturnType<typeof setInterval> | undefined

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false

      const send = (event: string, data: unknown) => {
        if (closed) return
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      const close = () => {
        if (closed) return
        closed = true
        if (interval) clearInterval(interval)
        try {
          controller.close()
        } catch {
          // Already closed by the client disconnecting.
        }
      }

      const tick = async () => {
        try {
          const job = await getLatestJobForProject(projectId)

          if (!job) {
            send('done', { status: 'idle' })
            close()
            return
          }

          /*
           * The person watching this stream is the one whose credits are held,
           * and this loop is already reading the exact row that says so — so a
           * run nothing ever collected is ended here, in front of them, rather
           * than by a sweep that comes round later.
           *
           * It is the same check the sweeper uses, so the two cannot disagree
           * about what stuck means, and the refund is idempotent on the job id,
           * so whichever arrives first wins. Waiting for the scheduled sweep
           * would leave someone staring at a spinner with their money gone for
           * as long as the schedule is slow — and on this plan it is daily.
           */
          if (isNeverCollected(job)) {
            await releaseHold(
              job.id,
              org.id,
              projectId,
              'The run was never started. Credits were returned automatically.',
            )
            send('done', { status: 'failed', creditsCharged: 0 })
            close()
            return
          }

          send('progress', { status: job.status, progress: job.progress })

          if (job.status !== 'queued' && job.status !== 'running') {
            send('done', { status: job.status, creditsCharged: job.creditsCharged })
            close()
          }
        } catch (error) {
          send('error', { message: error instanceof Error ? error.message : 'Stream failed' })
          close()
        }
      }

      await tick()
      interval = setInterval(tick, 1500)
    },

    cancel() {
      if (interval) clearInterval(interval)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Without this, a proxy buffers the stream and nothing arrives until the end.
      'X-Accel-Buffering': 'no',
    },
  })
}
