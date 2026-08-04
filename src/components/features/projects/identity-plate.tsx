import { Sparkles } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { brandTheme, fontStack } from '@/lib/brand-theme'
import { formatDate } from '@/lib/utils'
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
}: {
  project: Project
  palette: BrandPalette
  fonts: BrandFonts
  slogan: string | null
  logo?: GeneratedFile
  locale: string
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
      className="overflow-hidden rounded-panel bg-[var(--brand-paper)] shadow-[var(--shadow-soft)] ring-1 ring-[var(--brand-line)]"
    >
      <div className="flex flex-wrap items-center gap-x-10 gap-y-7 p-8 sm:p-12">
        <div className="grid size-28 shrink-0 place-items-center sm:size-44">
          {logo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={publicUrl(logo.r2Key) ?? `/api/files/${logo.id}`}
              alt=""
              className="size-full object-contain"
            />
          ) : (
            <Sparkles className="size-8" style={{ color: 'var(--brand-ink-faint)' }} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h1
            lang={project.language}
            style={{ fontFamily: fontStack(fonts?.heading), color: 'var(--brand-ink)' }}
            className="text-balance text-3xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-5xl"
          >
            {name}
          </h1>

          {slogan && (
            <p
              lang={project.language}
              style={{ fontFamily: fontStack(fonts?.body), color: 'var(--brand-accent)' }}
              className="mt-3 text-lg sm:text-xl"
            >
              {slogan}
            </p>
          )}

          <p style={{ color: 'var(--brand-ink-faint)' }} className="mt-5 text-sm">
            {project.industry} · {project.country} ·{' '}
            {t('createdOn', { date: formatDate(project.createdAt, locale) })}
          </p>
        </div>
      </div>

      {swatches.length > 0 && (
        <div aria-hidden className="flex h-3 w-full">
          {swatches.map((hex, index) => (
            <span key={`${hex}-${index}`} className="flex-1" style={{ backgroundColor: hex }} />
          ))}
        </div>
      )}
    </header>
  )
}
