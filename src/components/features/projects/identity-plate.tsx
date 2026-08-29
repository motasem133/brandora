import { Sparkles } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { brandTheme, fontStack } from '@/lib/brand-theme'
import { cn, formatDate } from '@/lib/utils'
import type { BrandFonts, BrandPalette } from '@/lib/brand-theme'
import type { GeneratedFile, Project } from '@/server/db/schema'
import { publicUrl } from '@/server/storage/r2'

/**
 * The first thing on a brand's page: the brand, wearing itself.
 *
 * What stood here was a 56px thumbnail beside a title in the app's own face,
 * over a page that then explained in Brandora's purple what colours the
 * customer's brand had. This plate is set on the brand's own ground, its name
 * in its own heading face, its slogan in its own accent, and its palette laid
 * along the base — so the page opens by demonstrating the coherence the product
 * sells rather than by describing it.
 *
 * App actions stay outside it. A gradient chrome button dropped onto a
 * generated ground is the one thing that would break the illusion, and a
 * destructive control has no business borrowing a brand's colour.
 */
export async function IdentityPlate({
  project,
  palette,
  fonts,
  slogan,
  logo,
  locale,
  /**
   * The brand's name is the page's heading on the customer's own project, and
   * a section heading on the support view, which titles itself after the
   * customer. Two `<h1>`s on one page is not a style question — it is a
   * document with two subjects, and a screen reader says so.
   */
  as: Heading = 'h1',
}: {
  /*
   * The five fields this actually reads, rather than the whole row.
   *
   * A full `Project` still satisfies it — structural typing — so the customer's
   * page passes exactly what it always did. What it buys is the support view,
   * which assembles its project from a join across four tables and has no whole
   * row to hand over: with the wide type that had to be cast, and the cast
   * quietly swallowed a missing `createdAt` until the page crashed in a
   * browser.
   */
  project: Pick<Project, 'businessName' | 'title' | 'language' | 'industry' | 'country' | 'createdAt'>
  palette: BrandPalette
  fonts: BrandFonts
  slogan: string | null
  logo?: GeneratedFile
  locale: string
  as?: 'h1' | 'h2'
}) {
  const t = await getTranslations('Projects')

  const theme = brandTheme(palette)
  const name = project.businessName || project.title

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
    <header
      style={theme.vars}
      /*
       * Flat, and flat on purpose: this is the brand's own paper.
       *
       * A wash mixed from the primary looked better on a plate with no mark on
       * it and was wrong the moment one arrived. A generated logo is raster on
       * its own background — that background *is* `palette.background`, which is
       * what `--guest-paper` resolves to — so the instant the plate stops being
       * that exact colour the mark shows as a rectangle sitting on a gradient.
       * The brand supplies one ground and the mark was drawn on it; the plate's
       * job is to be that ground, not to improve on it.
       */
      className="overflow-hidden rounded-panel bg-[var(--guest-paper)] shadow-[var(--shadow-soft)] ring-1 ring-[var(--guest-line)]"
    >
      <div className="flex flex-wrap items-center gap-x-9 gap-y-6 p-7 sm:p-9">
        <div className="grid size-24 shrink-0 place-items-center sm:size-36">
          {logo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={publicUrl(logo.r2Key) ?? `/api/files/${logo.id}`}
              alt=""
              /*
               * `multiply` only on a light paper.
               *
               * It exists for the mark whose own raster plate is pure white
               * while the brand's paper is cream — that mismatch is a visible
               * rectangle, and multiplying dissolves it. On a *dark* paper the
               * same blend is destructive: it multiplies a light mark toward
               * black and the artwork disappears into the ground.
               */
              className={cn('size-full object-contain', !theme.isDark && 'mix-blend-multiply')}
            />
          ) : (
            <Sparkles className="size-8" style={{ color: 'var(--guest-ink-faint)' }} />
          )}
        </div>

        {/*
          `basis-64`, not `flex-1`. `flex-1` sets `flex-basis: 0%`, so this
          column shrank to 126px beside the mark at 390px wide and wrapped the
          brand name onto two lines and the meta onto four — the page's peak
          moment, broken on the device someone shows their brand on.
        */}
        <div className="min-w-0 grow basis-64">
          <Heading
            lang={project.language}
            dir="auto"
            style={{ fontFamily: fontStack(fonts?.heading), color: 'var(--guest-ink)' }}
            className="text-balance text-3xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-4xl"
          >
            {name}
          </Heading>

          {slogan && (
            <p
              lang={project.language}
              /*
               * `dir` as well as `lang`. `lang` carries pronunciation and font
               * selection; it does nothing for bidi. Without this, an English
               * slogan inside the Arabic UI renders as ".Built to be understood"
               * — the trailing period jumps to the visual left. `palette-grid`
               * already learned this for hex codes; the brand's own tagline is
               * where it matters most.
               */
              dir="auto"
              style={{ fontFamily: fontStack(fonts?.body), color: 'var(--guest-accent)' }}
              className="mt-3 text-lg sm:text-xl"
            >
              {slogan}
            </p>
          )}

          <p dir="auto" style={{ color: 'var(--guest-ink-faint)' }} className="mt-5 text-sm">
            {project.industry} · {project.country} ·{' '}
            {t('createdOn', { date: formatDate(project.createdAt, locale) })}
          </p>
        </div>
      </div>

      {/*
        Inset rather than full-bleed.

        As a bleeding band it met the panel's 24px radius at 12px tall, so its
        ends were shaved into a shape that reads as a rendering fault rather
        than as a swatch. Inside the padding with a radius of its own it is
        unambiguously an element, and it matches how the brand cards in the
        grid show the same four colours.
      */}
      {swatches.length > 0 && (
        <div aria-hidden className="px-7 pb-7 sm:px-9 sm:pb-9">
          <div className="flex h-2.5 overflow-hidden rounded-full shadow-[inset_0_0_0_1px_var(--guest-line)]">
            {swatches.map((hex, index) => (
              <span key={`${hex}-${index}`} className="flex-1" style={{ backgroundColor: hex }} />
            ))}
          </div>
        </div>
      )}
    </header>
  )
}
