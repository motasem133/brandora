import { getTranslations } from 'next-intl/server'

import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { listContent } from '@/server/db/queries/content'
import { ContentPending } from './content-pending'

/**
 * What has been made, newest first.
 *
 * A panel of rows rather than a grid of cards. A card per piece would be the
 * shape DESIGN.md rules out — a stack of same-size boxes carrying a heading and
 * two lines — and it scans worse for the thing this list is for, which is
 * finding one item among many.
 */
export async function ContentLibrary({
  organizationId,
  projectId,
  limit,
  emptyBody,
}: {
  organizationId: string
  /** Narrows to one brand — and takes the brand's name off every row with it. */
  projectId?: string
  limit?: number
  /**
   * The Studio's own empty state tells you to pick a brand, which is the wrong
   * instruction on a page where the brand is the thing you are looking at.
   */
  emptyBody?: string
}) {
  const t = await getTranslations('Studio')
  const items = await listContent(organizationId, { projectId, limit })

  /* Mounted here rather than at the two call sites, because this is what knows
     whether anything is still being made. */
  const generating = items.filter((item) => item.status === 'generating').length

  if (items.length === 0) {
    return (
      <div className="rounded-panel border border-dashed border-line p-10">
        <EmptyState title={t('emptyTitle')} body={emptyBody ?? t('emptyBody')} />
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface/60">
      <ContentPending projectId={projectId} generating={generating} />
      <ul className="divide-y divide-line">
        {items.map((item) => {
          const body = item.body as
            | {
                kind?: string
                items?: { caption: string }[]
                caption?: string
                frames?: { fileId: string; lead: string }[]
              }
            | null

          /* A carousel's own caption, a caption set's first line, or the brief
             it was asked for — whichever exists, in that order. */
          const preview = body?.caption ?? body?.items?.[0]?.caption ?? item.brief ?? ''
          const frames = body?.kind === 'carousel' ? (body.frames ?? []) : []

          return (
            <li key={item.id} className="flex flex-wrap items-start gap-x-4 gap-y-2 px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Flat wash, no light — a Badge reports state, it is not a control. */}
                  <Badge tone={item.status === 'failed' ? 'danger' : 'neutral'}>
                    {item.status === 'failed'
                      ? t('statusFailed')
                      : item.status === 'generating'
                        ? t('statusGenerating')
                        : t(`type_${item.type as 'social_post'}`)}
                  </Badge>
                  <p className="truncate text-sm font-medium text-fg">{item.title ?? item.brief}</p>
                </div>

                {preview && (
                  <p dir="auto" className="mt-1.5 line-clamp-2 text-sm text-fg-secondary">
                    {preview}
                  </p>
                )}

                {/*
                  The frames themselves, small and in order.

                  A carousel is pictures, and a row that describes it in words
                  is a row that makes you open something to find out what you
                  made. Served through the access-checked file route rather
                  than a public URL: these are a customer's unreleased work.
                */}
                {frames.length > 0 && (
                  <ul className="mt-2.5 flex flex-wrap gap-2">
                    {frames.map((frame, index) => (
                      <li key={frame.fileId}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- a
                            customer asset behind an authorised route; the optimizer
                            would need it public. */}
                        <img
                          src={`/api/files/${frame.fileId}`}
                          alt={frame.lead || t('frames', { count: index + 1 })}
                          loading="lazy"
                          className="size-16 rounded-control border border-line object-cover"
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Only when the list spans brands. Scoped to one, it is the same
                  word at the end of every row. */}
              {!projectId && <p className="shrink-0 text-xs text-fg-muted">{item.brandName}</p>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Matches the projects page's skeleton in shape; there is no shared primitive. */
export function ContentLibrarySkeleton({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="overflow-hidden rounded-card border border-line bg-surface/60"
    >
      <ul className="divide-y divide-line">
        {[0, 1, 2].map((i) => (
          <li key={i} className="px-5 py-4">
            <div className="shimmer-surface h-4 w-40 rounded-control" />
            <div className="shimmer-surface mt-2 h-3 w-3/4 rounded-control" />
          </li>
        ))}
      </ul>
    </div>
  )
}
