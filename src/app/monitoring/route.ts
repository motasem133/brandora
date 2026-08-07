import { SENTRY_DSN } from '@/lib/observability'

/**
 * The tunnel the browser posts its error reports to.
 *
 * `withSentryConfig({ tunnelRoute: '/monitoring' })` does two things: it points
 * the browser SDK at this path, and it generates the endpoint that forwards to
 * Sentry. Under Turbopack only the first half happens — the endpoint is emitted
 * by the plugin's webpack hook, which Next 16 never runs. The client dutifully
 * posted every report to a 404, which is the exact silent loss the tunnel
 * exists to prevent, and which nothing surfaces because a failed error report
 * has no one left to report to.
 *
 * So the endpoint is written out here. The plugin still owns the client half;
 * this only has to answer on the path it advertises.
 */
export async function POST(request: Request) {
  if (!SENTRY_DSN) return new Response(null, { status: 404 })

  const target = new URL(SENTRY_DSN)
  const project = target.pathname.replace(/^\//, '')

  const envelope = await request.text()
  const header = envelope.slice(0, envelope.indexOf('\n'))

  /*
   * Only this project's envelopes are forwarded. Without the check the route is
   * an open relay: anyone could post traffic through this origin to any Sentry
   * project, on our IP reputation and our bandwidth.
   */
  let dsn: URL
  try {
    dsn = new URL(JSON.parse(header).dsn)
  } catch {
    return new Response(null, { status: 400 })
  }

  if (dsn.host !== target.host || dsn.pathname.replace(/^\//, '') !== project) {
    return new Response(null, { status: 403 })
  }

  const upstream = await fetch(`https://${target.host}/api/${project}/envelope/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-sentry-envelope' },
    body: envelope,
  })

  // Sentry's own status travels back unchanged, so a rejected event looks
  // rejected in the browser's network panel rather than quietly succeeding.
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
