import { toErrorResponse } from '@/server/api-error'
import { renderSocialPost } from '@/server/render/social-post'

/**
 * Proves the renderer works on the platform it has to run on.
 *
 * Chromium in a serverless function is the one part of this that cannot be
 * verified from a laptop: the binary is different, the filesystem is read-only
 * apart from /tmp, there are no system fonts, and the memory ceiling is real.
 *
 * Gated on a secret that lives only in the environment, so the capability
 * disappears by deleting the variable — no deploy needed to switch it off, and
 * with the variable unset this route is a 404 like any other. It renders a
 * project's own post rather than arbitrary markup, so there is nothing here to
 * point at someone else's page.
 */
export const maxDuration = 60

export async function GET(request: Request) {
  try {
    const secret = process.env.RENDER_PROBE_SECRET
    if (!secret) return new Response(null, { status: 404 })

    const url = new URL(request.url)
    if (url.searchParams.get('secret') !== secret) return new Response(null, { status: 404 })

    const projectId = url.searchParams.get('projectId')
    if (!projectId) return Response.json({ error: 'projectId is required' }, { status: 400 })

    const startedAt = Date.now()
    const png = await renderSocialPost(projectId, Number(url.searchParams.get('size') ?? 1080))

    return new Response(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store',
        // Read from the response headers, so a successful render reports its
        // own cost without needing the logs.
        'X-Render-Ms': String(Date.now() - startedAt),
        'X-Render-Bytes': String(png.byteLength),
      },
    })
  } catch (error) {
    return toErrorResponse(error)
  }
}
