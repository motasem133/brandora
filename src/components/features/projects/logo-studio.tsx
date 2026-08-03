import { Check, Download, Sparkles } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import type { LogoRound } from '@/lib/logo-rounds'
import type { GeneratedFile } from '@/server/db/schema'
import { publicUrl } from '@/server/storage/r2'
import { LogoComposer } from './logo-composer'
import { SelectLogoButton, SelectMarkButton } from './logo-actions'

/**
 * The stage: one mark, large, and the controls that act on it.
 *
 * What this replaces was a grid of every concept from every round at thumbnail
 * size, stacked down the page — so the thing the customer is actually deciding
 * about was never bigger than 200px, and the fourth round pushed the first one
 * three screens down. Here one concept is on the canvas at a size you can judge,
 * its siblings sit under it as a row of switches, and the rest of the history
 * lives in the rail.
 */
export async function LogoStudio({
  projectId,
  round,
  concept,
  isLatestRound,
  primaryId,
  markLogoFileId,
  logoBrief,
  logoCost,
  affordable,
  isGenerating,
}: {
  projectId: string
  round?: LogoRound
  concept?: GeneratedFile
  isLatestRound: boolean
  primaryId: string | null
  markLogoFileId: string | null
  logoBrief: string | null
  logoCost: number
  affordable: boolean
  isGenerating: boolean
}) {
  const t = await getTranslations('Branding')

  const isPrimary = Boolean(concept && concept.id === primaryId)
  const isMark = Boolean(concept && concept.id === markLogoFileId)
  const style = String(concept?.metadata?.style ?? '')

  return (
    <section className="space-y-4">
      <div className="lit shadow-[var(--shadow-soft)]">
        <div className="lit-inner space-y-5 p-5 sm:p-7">
          {/*
            The direction that produced what is on the canvas. An older round
            without this reads as an unexplained duplicate of the newest.
          */}
          {/*
            No status chip up here. The action row under the canvas already
            says whether this concept is the chosen one, and saying it twice
            within one card is how a simple screen gets busy again.
          */}
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold">
              {round && !isLatestRound ? t('earlierRound', { round: round.round }) : t('logos')}
            </h2>
            <p className="mt-1 truncate text-sm text-fg-secondary">
              {round?.brief ? t('roundDirection', { brief: round.brief }) : t('logosHint')}
            </p>
          </div>

          {/*
            The canvas. White, because that is the ground these marks are drawn
            on, and large enough to judge one against another.

            The edge is a dark hairline rather than the app's own border token:
            that token is translucent white, which is invisible on white, and in
            the light theme the plate then dissolved into the card behind it.
          */}
          <div
            className={cn(
              'grid min-h-64 place-items-center rounded-card border border-black/5 bg-white p-6 sm:min-h-80',
              isGenerating && 'shimmer-surface',
            )}
          >
            {concept ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={publicUrl(concept.r2Key) ?? `/api/files/${concept.id}`}
                alt={style || 'Logo concept'}
                className="max-h-64 w-auto max-w-full object-contain sm:max-h-72"
              />
            ) : (
              <div className="text-center text-sm text-[#6f7b96]">
                <Sparkles className="mx-auto mb-2 size-6" />
                {t('noLogos')}
              </div>
            )}
          </div>

          {/* The rest of this round, as switches rather than as more canvases. */}
          {round && round.concepts.length > 1 && (
            <ol className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {round.concepts.map((option) => {
                const current = option.id === concept?.id
                const chosen = option.id === primaryId

                return (
                  <li key={option.id}>
                    <Link
                      href={`/dashboard/projects/${projectId}?tab=branding&round=${round.round}&concept=${option.id}`}
                      scroll={false}
                      aria-current={current ? 'true' : undefined}
                      title={String(option.metadata?.style ?? '')}
                      className={cn(
                        'relative block shrink-0 rounded-control border-2 bg-white p-1 transition-colors',
                        current ? 'border-brand' : 'border-line hover:border-line-strong',
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={publicUrl(option.r2Key) ?? `/api/files/${option.id}`}
                        alt={String(option.metadata?.style ?? 'Logo concept')}
                        loading="lazy"
                        className="size-16 object-contain"
                      />

                      {/* Which of these four is the brand's mark — the one
                          question the strip could not answer, since the border
                          means "on the canvas", not "chosen". */}
                      {chosen && (
                        <span
                          title={t('chosen')}
                          /* Inside the tile, not hanging off it: the strip
                             scrolls, and anything outside the box is clipped. */
                          className="absolute end-1 top-1 grid size-4 place-items-center rounded-full bg-brand text-brand-fg"
                        >
                          <Check className="size-3" />
                          <span className="sr-only">{t('chosen')}</span>
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ol>
          )}

          {concept && (
            <div className="flex flex-wrap items-center gap-2">
              <SelectLogoButton projectId={projectId} fileId={concept.id} isPrimary={isPrimary} />
              <SelectMarkButton projectId={projectId} fileId={concept.id} isMark={isMark} />

              {style && (
                <span className="ms-1 text-xs capitalize text-fg-muted">{style}</span>
              )}

              <a
                href={`/api/files/${concept.id}`}
                className="ms-auto inline-flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-xs text-fg-secondary transition-colors hover:bg-elevated hover:text-fg"
              >
                <Download className="size-3.5" />
                {t('download')}
              </a>
            </div>
          )}
        </div>
      </div>

      <LogoComposer
        projectId={projectId}
        brief={logoBrief}
        cost={logoCost}
        affordable={affordable}
        isRunning={isGenerating}
      />
    </section>
  )
}
