'use client'

import { useAction } from 'next-safe-action/hooks'
import * as React from 'react'

import { pendingContentCount } from '@/server/actions/content'

/**
 * Waits for work that finishes after the page was drawn.
 *
 * A carousel is made in the background — five frames, each launching its own
 * browser — so the request that asks for it returns long before it exists. The
 * library kept saying "writing" while the project page, rendered later from the
 * same row, showed it finished. Nothing was wrong with either page; nothing was
 * telling them.
 *
 * A poll rather than a stream. The generation panel earns its SSE by showing
 * per-step progress on work that lasts minutes; there is nothing to show here
 * but "not yet", and a route that holds a connection open to say so is a
 * connection held open to say nothing.
 *
 * `location.reload()` rather than `router.refresh()`, for the reason recorded
 * in the generation panel and against the logo control: the refresh does not
 * commit on these pages. The RSC request goes out and the DOM keeps the old
 * output, so a piece that had finished still read as writing.
 */
export function ContentPending({
  projectId,
  /** What the server rendered. Zero means there is nothing to wait for. */
  generating,
}: {
  projectId?: string
  generating: number
}) {
  const { executeAsync } = useAction(pendingContentCount)

  React.useEffect(() => {
    if (generating < 1) return

    let cancelled = false

    /*
     * Five seconds, and only while something is actually being made. A
     * carousel takes a minute or two, so this is a handful of counts against a
     * page nobody would otherwise know to reload — and it stops the moment the
     * work does, because the reload re-renders with `generating` at zero.
     */
    const timer = setInterval(async () => {
      const outcome = await executeAsync({ projectId })
      const now = outcome?.data?.generating
      if (cancelled || typeof now !== 'number') return
      if (now < generating) window.location.reload()
    }, 5000)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [executeAsync, generating, projectId])

  return null
}
