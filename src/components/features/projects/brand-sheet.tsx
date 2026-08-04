import { getTranslations } from 'next-intl/server'

import { CopyButton } from '@/components/ui/copy-button'
import { Disclosure } from '@/components/ui/disclosure'
import type { BrandingAsset, GeneratedFile } from '@/server/db/schema'
import { LogoVariations } from './logo-variations'
import { NamePicker } from './name-picker'

/**
 * The reference material: what is still open, and what is consulted rarely.
 *
 * The mark, the type and the colour have moved up into the spread, where the
 * decision is actually made. What is left here is the names still on the table,
 * the written brand, and the file variations — read once or twice each, so they
 * sit below the fold and the two rarest fold away entirely.
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

  const hasNames = branding.businessNameIdeas.length > 0
  const hasStory = Boolean(branding.brandStory || branding.brandVoice || branding.brandValues.length)

  return (
    <div className="space-y-4">
      {/*
        The slogan is no longer repeated here. It is set in the brand's own
        accent on the identity plate at the top of the page, which is both where
        it belongs and the only place it needs to be.
      */}
      {hasNames && (
        <section className="rounded-panel border border-line p-7">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">
            {t('nameIdeas')}
          </h2>
          <p className="mt-1.5 text-sm text-fg-muted">{t('nameIdeasHint')}</p>
          <div className="mt-4">
            <NamePicker
              projectId={projectId}
              ideas={branding.businessNameIdeas}
              selected={chosenName}
            />
          </div>
        </section>
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
                <h3 className="text-xs uppercase tracking-wide text-fg-muted">{t('voice')}</h3>
                <p className="mt-1 text-sm leading-relaxed text-fg-secondary">
                  {branding.brandVoice}
                </p>
              </div>
            )}

            {branding.brandValues.length > 0 && (
              <div>
                <h3 className="text-xs uppercase tracking-wide text-fg-muted">{t('values')}</h3>
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
