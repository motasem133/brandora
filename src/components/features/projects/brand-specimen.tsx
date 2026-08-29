import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'
import { brandTheme, fontStack } from '@/lib/brand-theme'
import { cn, formatDate } from '@/lib/utils'
import type { BrandSpecimen as Specimen } from '@/server/db/queries/projects'
import { publicUrl } from '@/server/storage/r2'

/**
 * The colour and the shape a state is drawn in.
 *
 * Every state gets a word beside the dot, finished ones included. The card used
 * to stay silent on success on the grounds that a finished brand says so by
 * existing — true of one card and wrong of a grid, where a silent row and a
 * loud one put the second line of every card at a different height and the eye
 * loses the column it was scanning.
 */
const STATE_INK = {
  draft: 'text-fg-muted',
  queued: 'text-warning',
  generating: 'text-warning',
  completed: 'text-success',
  failed: 'text-danger',
  partial: 'text-warning',
} as const

const STATE_DOT = {
  draft: 'bg-fg-muted',
  queued: 'bg-warning',
  generating: 'bg-warning',
  completed: 'bg-success',
  failed: 'bg-danger',
  partial: 'bg-warning',
} as const

/**
 * One brand in a grid of them.
 *
 * The card is a chrome frame with the brand's own field inside it, and that
 * division is the whole design. The field — the mark on the brand's paper, in
 * the brand's colours — is what differs between two cards. Everything below it
 * is identical: same face, same sizes, same ink, same row. So a customer with
 * ten brands scans one straight column of names and one straight column of
 * states, and the only thing their eye has to work at is the work itself.
 *
 * It used to paint the *whole* card in the guest palette, name and all. That
 * made a beautiful single card and an unreadable grid: ten different heading
 * faces at ten different weights on ten different grounds, with the app's own
 * status text tinted per brand until "Failed" on a pale paper was a suggestion.
 * The guest palette owns the field. The chrome owns the facts about the job.
 */
export async function BrandSpecimen({
  specimen,
  locale,
}: {
  specimen: Specimen
  locale: string
}) {
  const t = await getTranslations('Projects')
  const { project, palette, fonts, logo } = specimen

  const theme = brandTheme(palette)
  const name = project.businessName || project.title

  /*
   * The band is the brand's colours, not its ground. Including `background`
   * printed a near-white dot among four, which reads as a rendering fault
   * rather than as a swatch — and it is redundant, since the field above is
   * that colour already.
   */
  const swatches = palette
    ? [palette.primary, palette.secondary, palette.accent, palette.text]
    : []

  /* Industry and country, which is what the second line is for. A slogan is a
     sentence and belongs on the brand's own page, not in a 12px line that gets
     truncated in a grid of ten. */
  const subtitle = [project.industry, project.country].filter(Boolean).join(' · ')

  return (
    <Link
      href={`/dashboard/projects/${project.id}`}
      className="group block h-full rounded-card focus-visible:outline-none"
    >
      <article
        className={cn(
          'flex h-full flex-col overflow-hidden rounded-card bg-surface',
          'ring-1 ring-line transition-shadow duration-200',
          'shadow-[var(--shadow-soft)] group-hover:shadow-[var(--shadow-lifted)]',
          'group-focus-visible:ring-2 group-focus-visible:ring-brand',
        )}
      >
        {/*
          The brand's own field: its paper, flat.

          A wash mixed from the primary read better on a field with no mark on
          it and was wrong the moment one arrived — a generated logo is raster
          on its own background, and that background is `palette.background`,
          which is what `--guest-paper` resolves to. Any gradient here turns
          every real mark into a rectangle floating on it.
        */}
        <div
          style={theme.vars}
          className="relative grid h-28 shrink-0 place-items-center overflow-hidden bg-[var(--guest-paper)] px-6"
        >
          {logo ? (
            /*
              `multiply` dissolves the rectangle left by a mark whose own raster
              plate is white while the brand's paper is cream. Only on a light
              paper: on a dark one the same blend multiplies a light mark toward
              black and the artwork vanishes into the ground.
            */
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={publicUrl(logo.r2Key) ?? `/api/files/${logo.id}`}
              alt=""
              loading="lazy"
              className={cn(
                'max-h-16 w-auto max-w-[78%] object-contain',
                !theme.isDark && 'mix-blend-multiply',
              )}
            />
          ) : (
            /*
             * No mark yet is not an empty frame. Setting the name in the brand's
             * own heading face makes the field a wordmark until a drawn one
             * exists, which is both honest and the right shape. This is the one
             * place the guest face is still used, and it is inside the field.
             */
            <p
              style={{ fontFamily: fontStack(fonts?.heading), color: 'var(--guest-ink)' }}
              className="line-clamp-2 text-balance text-center text-xl font-semibold tracking-[-0.03em]"
            >
              {name}
            </p>
          )}

          {/* The field's own bottom edge, mixed from the brand's ink, so it
              closes against the chrome without a chrome-coloured line. */}
          <span
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-px bg-[var(--guest-line)]"
          />
        </div>

        <div className="flex flex-1 flex-col p-4">
          {/*
            `h2`, because both pages that render a grid of these put them
            directly under the page `h1` with nothing in between — so an `h3`
            skipped a level, and a screen reader's outline of the one screen a
            returning customer lives on had a hole in it. The size is set here
            and owes nothing to the level.
          */}
          <h2 className="truncate text-base font-semibold tracking-[-0.01em] text-fg">
            {name}
          </h2>

          {subtitle && <p className="mt-0.5 truncate text-xs text-fg-muted">{subtitle}</p>}

          <div className="mt-auto flex items-center justify-between gap-3 pt-3">
            {/* Never colour alone: the dot carries the hue, the word carries
                the meaning, and the word is what a screen reader gets. */}
            <p
              className={cn(
                'flex min-w-0 items-center gap-1.5 text-xs font-semibold',
                STATE_INK[project.status],
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'size-[0.4rem] shrink-0 rounded-full',
                  STATE_DOT[project.status],
                  project.status === 'generating' && 'animate-pulse',
                )}
              />
              <span className="truncate">{t(`status.${project.status}`)}</span>
            </p>

            {swatches.length > 0 ? (
              <div aria-hidden className="flex shrink-0 gap-1">
                {swatches.map((hex, index) => (
                  <span
                    key={`${hex}-${index}`}
                    className="size-2.5 rounded-full shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--text-primary)_14%,transparent)]"
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            ) : (
              <p className="shrink-0 font-mono text-[0.6875rem] text-fg-muted tabular-nums">
                {formatDate(project.createdAt, locale)}
              </p>
            )}
          </div>
        </div>
      </article>
    </Link>
  )
}
