import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'
import { brandTheme, fontStack } from '@/lib/brand-theme'
import { cn, formatDate } from '@/lib/utils'
import type { BrandSpecimen as Specimen } from '@/server/db/queries/projects'
import { publicUrl } from '@/server/storage/r2'

/** Only unfinished states are worth a word; a finished brand says so by existing. */
const STATE_DOT = {
  draft: 'bg-fg-muted',
  queued: 'bg-warning',
  generating: 'bg-warning animate-pulse',
  completed: '',
  failed: 'bg-danger',
  partial: 'bg-warning',
} as const

/**
 * One brand, shown as itself.
 *
 * The card is not a container around a database row — it is the brand's own
 * ground, with its mark drawn on it, its name set in its own heading face, and
 * its palette laid along the base as the sheet's own edge. Three of the things
 * the customer paid for are legible before they click anything.
 *
 * App chrome stays out of it deliberately. The one exception is the state dot,
 * because "this one failed" is a fact about the job, not about the brand, and
 * it may never be inferred from a colour alone — the word sits beside it.
 */
export async function BrandSpecimen({
  specimen,
  locale,
}: {
  specimen: Specimen
  locale: string
}) {
  const t = await getTranslations('Projects')
  const { project, palette, fonts, slogan, logo } = specimen

  const theme = brandTheme(palette)
  const name = project.businessName || project.title
  const unfinished = project.status !== 'completed'

  /*
   * The band is the brand's colours, not its ground. Including `background`
   * printed a near-white stripe on a near-white plate, so the band appeared to
   * stop two thirds of the way across — a rendering fault to every eye that saw
   * it, and a redundant one, since the paper it sits on is that colour already.
   */
  const swatches = palette
    ? [palette.primary, palette.secondary, palette.accent, palette.text]
    : []

  return (
    <Link
      href={`/dashboard/projects/${project.id}`}
      className="group block h-full focus-visible:outline-none"
    >
      <article
        style={theme.vars}
        className={cn(
          'flex h-full flex-col overflow-hidden rounded-panel bg-[var(--guest-paper)]',
          'shadow-[var(--shadow-soft)] transition-shadow duration-200',
          'group-hover:shadow-[var(--shadow-lifted)]',
          /*
           * A ring rather than a border, mixed from the brand's own ink. A
           * fixed app-coloured border around a brand's ground is the exact
           * thing that made every project look like the same template.
           */
          'ring-1 ring-[var(--guest-line)] group-focus-visible:ring-2 group-focus-visible:ring-brand',
        )}
      >
        <div className="relative grid min-h-40 flex-1 place-items-center px-8 py-10">
          {logo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={publicUrl(logo.r2Key) ?? `/api/files/${logo.id}`}
              alt=""
              loading="lazy"
              className="max-h-24 w-auto max-w-full object-contain"
            />
          ) : (
            /*
             * No mark yet is not an empty frame. Setting the name in the
             * brand's own heading face makes the specimen a wordmark until a
             * drawn one exists, which is both honest and the right shape.
             */
            <p
              style={{ fontFamily: fontStack(fonts?.heading), color: 'var(--guest-ink)' }}
              className="text-balance text-center text-2xl font-semibold tracking-[-0.03em]"
            >
              {name}
            </p>
          )}
        </div>

        <div className="px-6 pb-5">
          {unfinished && (
            <p
              style={{ color: 'var(--guest-ink-soft)' }}
              className="mb-2 flex items-center gap-1.5 text-xs font-medium"
            >
              <span className={cn('size-1.5 rounded-full', STATE_DOT[project.status])} />
              {t(`status.${project.status}`)}
            </p>
          )}

          {/*
            `h2`, because both pages that render a grid of these put them
            directly under the page `h1` with nothing in between — so an `h3`
            skipped a level on the projects list and on the dashboard, and a
            screen reader's outline of the one screen a returning customer lives
            on had a hole in it. The size is set here and owes nothing to the
            level.
          */}
          <h2
            style={{ fontFamily: fontStack(fonts?.heading), color: 'var(--guest-ink)' }}
            className="truncate text-lg font-semibold tracking-[-0.02em]"
          >
            {name}
          </h2>

          {slogan && (
            <p
              style={{ color: 'var(--guest-ink-soft)' }}
              className="mt-1 truncate text-sm"
              /* The brand's own body face, so the specimen shows the pairing
                 and not just the display cut. */
              lang={project.language}
              dir="auto"
            >
              {slogan}
            </p>
          )}

          <p style={{ color: 'var(--guest-ink-faint)' }} className="mt-2.5 text-xs">
            {project.industry} · {project.country} ·{' '}
            {t('createdOn', { date: formatDate(project.createdAt, locale) })}
          </p>
        </div>

        {/* The palette as the sheet's own base edge, not five chips in a row. */}
        {swatches.length > 0 && (
          <div aria-hidden className="flex h-2.5 w-full">
            {swatches.map((hex, index) => (
              <span key={`${hex}-${index}`} className="flex-1" style={{ backgroundColor: hex }} />
            ))}
          </div>
        )}
      </article>
    </Link>
  )
}
