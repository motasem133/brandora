import { Check, Download, Sparkles } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { brandTheme } from '@/lib/brand-theme'
import type { BrandPalette } from '@/lib/brand-theme'
import type { LogoRound } from '@/lib/logo-rounds'
import type { GeneratedFile } from '@/server/db/schema'
import { publicUrl } from '@/server/storage/r2'
import { LogoComposer } from './logo-composer'
import { SelectLogoButton } from './logo-actions'

/**
 * The stage: one mark, large, and the controls that act on it.
 *
 * What this replaces was a grid of every concept from every round at thumbnail
 * size, stacked down the page — so the thing the customer is actually deciding
 * about was never bigger than 200px, and the fourth round pushed the first one
 * three screens down. Here one concept is on the canvas at a size you can judge,
 * its siblings sit under it as a row of switches, and the earlier rounds are a
 * strip across the top of the section.
 *
 * One decision, not two. There used to be a second control naming a separate
 * concept for the favicon and the avatars, which meant the customer had to
 * understand why a logo and an icon are different things before either button
 * did anything — and picking the icon first did nothing at all, because the
 * rebuild it triggers was skipped whenever no logo had been chosen yet. The
 * icon follows the logo now.
 */
export async function LogoStudio({
  projectId,
  round,
  concept,
  isLatestRound,
  chosenId,
  logoBrief,
  logoCost,
  affordable,
  creditBalance,
  isGenerating,
  palette,
  emailVerified,
  userEmail,
}: {
  projectId: string
  round?: LogoRound
  concept?: GeneratedFile
  isLatestRound: boolean
  chosenId: string | null
  logoBrief: string | null
  logoCost: number
  affordable: boolean
  creditBalance: number
  isGenerating: boolean
  palette: BrandPalette
  emailVerified: boolean
  userEmail: string
}) {
  const t = await getTranslations('Branding')
  const theme = brandTheme(palette)

  const isPrimary = Boolean(concept && concept.id === chosenId)
  const style = String(concept?.metadata?.style ?? '')

  return (
    <section className="space-y-5">
      {/*
        No card around any of this any more.

        The mark was a plate inside a panel inside the page — three nested
        containers, each with its own edge, around one image. The canvas is the
        object here; it carries its own ground and its own edge, and everything
        else on this column is a control acting on it.
      */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">
          {round && !isLatestRound ? t('earlierRound', { round: round.round }) : t('logos')}
        </h2>
        <p className="mt-1.5 text-sm text-fg-secondary">
          {round?.brief ? t('roundDirection', { brief: round.brief }) : t('logosHint')}
        </p>
      </div>

          {/*
            The canvas, on the brand's own background colour rather than on a
            hard-coded white.

            A mark is drawn to sit on its brand's ground, and judging it against
            a white it will never appear on is judging the wrong thing. The edge
            is mixed from the brand's ink so it reads as a hairline on a pale
            ground and on a dark one alike — the app's own border token is
            translucent white, which disappears entirely on white.

            The mark is also given room: it was floating at a fraction of its
            container, which made the most important artifact on the page look
            like an afterthought.
          */}
          <div
            style={theme.vars}
            className={cn(
              'grid min-h-72 place-items-center rounded-card p-8 sm:min-h-96',
              'bg-[var(--brand-paper)] ring-1 ring-[var(--brand-line)]',
              isGenerating && 'shimmer-surface',
            )}
          >
            {concept ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={publicUrl(concept.r2Key) ?? `/api/files/${concept.id}`}
                alt={style || 'Logo concept'}
                className="max-h-56 w-auto max-w-full object-contain sm:max-h-80"
              />
            ) : (
              <div className="text-center text-sm" style={{ color: 'var(--brand-ink-faint)' }}>
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
                const chosen = option.id === chosenId

                return (
                  <li key={option.id}>
                    <Link
                      href={`/dashboard/projects/${projectId}?round=${round.round}&concept=${option.id}`}
                      scroll={false}
                      aria-current={current ? 'true' : undefined}
                      title={String(option.metadata?.style ?? '')}
                      style={theme.vars}
                      className={cn(
                        'relative block shrink-0 rounded-control border-2 bg-[var(--brand-paper)] p-1 transition-colors',
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

      <LogoComposer
        projectId={projectId}
        brief={logoBrief}
        cost={logoCost}
        affordable={affordable}
        creditBalance={creditBalance}
        isRunning={isGenerating}
        emailVerified={emailVerified}
        userEmail={userEmail}
      />
    </section>
  )
}
