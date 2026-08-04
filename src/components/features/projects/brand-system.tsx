import { getTranslations } from 'next-intl/server'

import { CopyButton } from '@/components/ui/copy-button'
import { brandTheme, fontStack } from '@/lib/brand-theme'
import type { BrandFonts, BrandPalette } from '@/lib/brand-theme'
import { PaletteGrid } from './palette-grid'

/**
 * The type and the colour, as a page of a brand book rather than as two cards.
 *
 * The specimen is set in the brand's own words — its name in the heading face,
 * its slogan in the body face — because that is the pairing the customer will
 * actually ship, and "Aa" in a bordered box demonstrates nothing about whether
 * the two faces belong together.
 *
 * The families are Google Fonts names, so they render for a visitor who has
 * them and fall back to the app's face for one who does not. The name is
 * printed either way: that is the part they paste.
 */
export async function BrandSystem({
  palette,
  fonts,
  name,
  slogan,
  language,
}: {
  palette: BrandPalette
  fonts: BrandFonts
  name: string
  slogan: string | null
  language: string
}) {
  const t = await getTranslations('Branding')
  const theme = brandTheme(palette)

  if (!palette && !fonts) return null

  return (
    <div className="space-y-5">
      {fonts && (
        <section
          style={theme.vars}
          className="overflow-hidden rounded-panel bg-[var(--brand-paper)] shadow-[var(--shadow-soft)] ring-1 ring-[var(--brand-line)]"
        >
          <div className="space-y-6 p-7">
            <h2
              style={{ color: 'var(--brand-ink-faint)' }}
              className="text-xs font-semibold uppercase tracking-[0.12em]"
            >
              {t('fonts')}
            </h2>

            <div>
              <p
                lang={language}
                style={{ fontFamily: fontStack(fonts.heading), color: 'var(--brand-ink)' }}
                className="text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.03em]"
              >
                {name}
              </p>
              <p
                lang={language}
                style={{ fontFamily: fontStack(fonts.body), color: 'var(--brand-ink-soft)' }}
                className="mt-3 text-base leading-relaxed"
              >
                {slogan ?? t('fontsSpecimen')}
              </p>
            </div>

            <dl className="space-y-2 border-t pt-5" style={{ borderColor: 'var(--brand-line)' }}>
              {(
                [
                  [t('fontHeading'), fonts.heading],
                  [t('fontBody'), fonts.body],
                ] as const
              )
                .filter(([, family]) => Boolean(family))
                .map(([role, family]) => (
                  <div key={role} className="flex items-center justify-between gap-3">
                    <dt style={{ color: 'var(--brand-ink-faint)' }} className="text-xs">
                      {role}
                    </dt>
                    <dd className="flex min-w-0 items-center gap-1.5">
                      <a
                        href={`https://fonts.google.com/?query=${encodeURIComponent(family)}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: 'var(--brand-ink)' }}
                        className="truncate text-sm font-medium underline decoration-transparent underline-offset-4 transition-[text-decoration-color] hover:decoration-current"
                      >
                        {family}
                      </a>
                      <CopyButton value={family} label={family} />
                    </dd>
                  </div>
                ))}
            </dl>
          </div>
        </section>
      )}

      {palette && (
        /*
         * The swatches keep the app's ground rather than the brand's. They
         * supply their own colour, and a coloured ground behind a colour chart
         * is the one place a brand's paper actively lies about what a hex looks
         * like.
         */
        <section className="rounded-panel border border-line p-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">
                {t('palette')}
              </h2>
              <p className="mt-1.5 text-sm text-fg-muted">{t('paletteHint')}</p>
            </div>
            <CopyButton
              value={Object.entries(palette)
                .map(([role, value]) => `${role}: ${value}`)
                .join('\n')}
              label={t('palette')}
            />
          </div>

          <div className="mt-5">
            <PaletteGrid palette={palette as unknown as Record<string, string>} />
          </div>
        </section>
      )}
    </div>
  )
}
