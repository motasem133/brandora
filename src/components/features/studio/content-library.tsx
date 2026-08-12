import { ChevronDown } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { listContent } from '@/server/db/queries/content'
import { ContentPending } from './content-pending'
import { ContentText } from './content-text'

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
                items?: ({ caption?: string; headline?: string } & Record<string, unknown>)[]
                caption?: string
                frames?: { fileId: string; lead: string }[]
              }
            | null

          /* A carousel's own caption, the first caption or headline of a
             written set, or the brief it was asked for — in that order. */
          const first = body?.items?.[0]
          const preview =
            body?.caption ?? first?.caption ?? first?.headline ?? item.brief ?? ''
          const frames = body?.kind === 'carousel' || body?.kind === 'story' ? (body.frames ?? []) : []
          /* The written types open; the drawn ones show their frames instead. */
          const written =
            body?.kind === 'social_post' || body?.kind === 'ad' ? body.kind : null

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

                {preview && !written && (
                  <p dir="auto" className="mt-1.5 line-clamp-2 text-sm text-fg-secondary">
                    {preview}
                  </p>
                )}

                {/*
                  Words open where they are listed.

                  Native `<details>`, so it costs no JavaScript, survives
                  find-in-page and closes the list back up. The summary keeps
                  the clamped preview, so nothing is lost by leaving it shut.
                */}
                {written && (
                  <details className="group mt-1.5">
                    <summary className="flex cursor-pointer list-none items-center gap-1.5 [&::-webkit-details-marker]:hidden">
                      <ChevronDown className="size-3.5 shrink-0 text-fg-muted transition-transform group-open:rotate-180" />
                      <span dir="auto" className="line-clamp-1 text-sm text-fg-secondary">
                        {preview}
                      </span>
                    </summary>
                    <ContentText
                      kind={written}
                      items={(body?.items ?? []) as never}
                    />
                  </details>
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
