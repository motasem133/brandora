import { getTranslations } from 'next-intl/server'

import { Card, CardTitle } from '@/components/ui/card'
import { CopyButton } from '@/components/ui/copy-button'
import { Disclosure } from '@/components/ui/disclosure'
import type { BrandingAsset, GeneratedFile } from '@/server/db/schema'
import { LogoVariations } from './logo-variations'
import { NamePicker } from './name-picker'
import { PaletteGrid } from './palette-grid'

/**
 * Everything about the brand that is not the mark.
 *
 * This was eight stacked cards — slogan, palette, fonts, names, story, values,
 * voice, variations — each with a heading and a wrapper, most of them read once
 * and never again. They are two cards and two disclosures now: what you look at
 * while deciding stays open, what you consult occasionally folds away, and the
 * page stops being a scroll to nowhere.
 */
export async function BrandSheet({
  branding,
  files,
  projectId,
  chosenName,
}: {
  branding: BrandingAsset
  files: GeneratedFile[]
  projectId: string
  chosenName: string | null
}) {
  const t = await getTranslations('Branding')

  const palette = branding.colorPalette
  const fonts = branding.fontRecommendations
  const hasNames = branding.businessNameIdeas.length > 0
  const hasStory = Boolean(branding.brandStory || branding.brandVoice || branding.brandValues.length)

  return (
    <div className="space-y-4">
      {(branding.slogan || hasNames) && (
        <Card className="space-y-5">
          {branding.slogan && (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="text-sm font-medium text-fg-secondary">
                  {t('slogan')}
                </CardTitle>
                <p className="mt-1.5 font-display text-xl gradient-text">{branding.slogan}</p>
              </div>
              <CopyButton value={branding.slogan} label={t('slogan')} />
            </div>
          )}

          {hasNames && (
            <div className={branding.slogan ? 'border-t border-line pt-5' : undefined}>
              <CardTitle className="text-sm font-medium text-fg-secondary">
                {t('nameIdeas')}
              </CardTitle>
              <p className="mt-1 text-sm text-fg-muted">{t('nameIdeasHint')}</p>
              <div className="mt-3">
                <NamePicker
                  projectId={projectId}
                  ideas={branding.businessNameIdeas}
                  selected={chosenName}
                />
              </div>
            </div>
          )}
        </Card>
      )}

      {(palette || fonts) && (
        <Card className="space-y-5">
          {palette && (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-medium text-fg-secondary">
                    {t('palette')}
                  </CardTitle>
                  <p className="mt-1 text-sm text-fg-muted">{t('paletteHint')}</p>
                </div>
                {/* The whole set, in the order a stylesheet would want it. */}
                <CopyButton
                  value={Object.entries(palette)
                    .map(([name, value]) => `${name}: ${value}`)
                    .join('\n')}
                  label={t('palette')}
                  showLabel
                />
              </div>
              <div className="mt-3">
                <PaletteGrid palette={palette as Record<string, string>} />
              </div>
            </div>
          )}

          {fonts && (
            <div className={palette ? 'border-t border-line pt-5' : undefined}>
              <CardTitle className="text-sm font-medium text-fg-secondary">{t('fonts')}</CardTitle>
              <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                {Object.entries(fonts)
                  .filter(([, value]) => Boolean(value))
                  .map(([role, family]) => (
                    <div key={role} className="rounded-control border border-line p-4">
                      <dt className="text-xs uppercase tracking-wide text-fg-muted">{role}</dt>
                      {/*
                        A specimen rather than a filename. The family renders for
                        anyone who has it installed and falls back to the app's
                        own face for anyone who does not — either way the name
                        below it is what you paste into Google Fonts.
                      */}
                      <dd
                        className="mt-2 truncate text-3xl leading-tight"
                        style={{ fontFamily: `"${family}", var(--font-sans)` }}
                        aria-hidden
                      >
                        Aa
                      </dd>
                      <dd className="mt-2 flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-sm font-medium">{family}</span>
                        <CopyButton value={String(family)} label={String(family)} />
                      </dd>
                      <dd>
                        <a
                          href={`https://fonts.google.com/?query=${encodeURIComponent(String(family))}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-brand hover:underline"
                        >
                          {t('findFont')}
                        </a>
                      </dd>
                    </div>
                  ))}
              </dl>
            </div>
          )}
        </Card>
      )}

      {hasStory && (
        <Disclosure
          title={t('story')}
          meta={
            branding.brandStory ? (
              <CopyButton value={branding.brandStory} label={t('story')} />
            ) : undefined
          }
        >
          <div className="space-y-5">
            {branding.brandStory && (
              <div className="space-y-3 text-sm leading-relaxed text-fg-secondary">
                {branding.brandStory
                  .split('\n')
                  .filter(Boolean)
                  .map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
              </div>
            )}

            {branding.brandVoice && (
              <div>
                <h4 className="text-xs uppercase tracking-wide text-fg-muted">{t('voice')}</h4>
                <p className="mt-1 text-sm leading-relaxed text-fg-secondary">
                  {branding.brandVoice}
                </p>
              </div>
            )}

            {branding.brandValues.length > 0 && (
              <div>
                <h4 className="text-xs uppercase tracking-wide text-fg-muted">{t('values')}</h4>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {branding.brandValues.map((value) => (
                    <li key={value} className="rounded-full bg-elevated px-3 py-1 text-sm">
                      {value}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Disclosure>
      )}

      <LogoVariations
        files={files}
        primaryLogoFileId={branding.primaryLogoFileId}
        markLogoFileId={branding.markLogoFileId}
      />
    </div>
  )
}
