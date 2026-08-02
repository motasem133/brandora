import { getTranslations } from 'next-intl/server'

import { Card, CardTitle } from '@/components/ui/card'
import type { BrandingAsset, GeneratedFile } from '@/server/db/schema'
import { LogoGrid } from './logo-grid'
import { NamePicker } from './name-picker'

export async function BrandingView({
  branding,
  logos = [],
  kit,
  projectId,
  chosenName,
  creditBalance,
  logoCost,
  logoBrief,
}: {
  branding: BrandingAsset
  logos?: GeneratedFile[]
  kit?: GeneratedFile
  projectId: string
  chosenName: string | null
  creditBalance: number
  logoCost: number
  logoBrief: string | null
}) {
  const t = await getTranslations('Branding')
  const palette = branding.colorPalette
  const fonts = branding.fontRecommendations

  return (
    <div className="space-y-6">
      <LogoGrid
        logos={logos}
        kit={kit}
        projectId={projectId}
        primaryLogoFileId={branding.primaryLogoFileId}
        creditBalance={creditBalance}
        logoCost={logoCost}
        logoBrief={logoBrief}
      />

      {branding.businessNameIdeas.length > 0 && (
        <Card className="space-y-4">
          <div>
            <CardTitle>{t('nameIdeas')}</CardTitle>
            <p className="mt-1 text-sm text-fg-secondary">{t('nameIdeasHint')}</p>
          </div>
          <NamePicker
            projectId={projectId}
            ideas={branding.businessNameIdeas}
            selected={chosenName}
          />
        </Card>
      )}

      {branding.slogan && (
        <Card>
          <CardTitle>{t('slogan')}</CardTitle>
          <p className="mt-3 font-display text-xl gradient-text">{branding.slogan}</p>
        </Card>
      )}

      {palette && (
        <Card className="space-y-4">
          <CardTitle>{t('palette')}</CardTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {Object.entries(palette).map(([name, value]) => (
              <div key={name}>
                <div
                  className="h-16 w-full rounded-lg border border-line"
                  style={{ backgroundColor: value }}
                />
                <p className="mt-1.5 text-xs capitalize text-fg-secondary">{name}</p>
                <p className="font-mono text-xs uppercase text-fg-muted">{value}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {fonts && (
        <Card className="space-y-3">
          <CardTitle>{t('fonts')}</CardTitle>
          <dl className="grid gap-3 sm:grid-cols-3">
            {Object.entries(fonts)
              .filter(([, value]) => Boolean(value))
              .map(([role, family]) => (
                <div key={role}>
                  <dt className="text-xs uppercase tracking-wide text-fg-muted">{role}</dt>
                  <dd className="mt-0.5 text-sm">{family}</dd>
                </div>
              ))}
          </dl>
        </Card>
      )}

      {branding.brandStory && (
        <Card className="space-y-3">
          <CardTitle>{t('story')}</CardTitle>
          <div className="space-y-3 text-sm leading-relaxed text-fg-secondary">
            {branding.brandStory.split('\n').filter(Boolean).map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        {branding.brandValues.length > 0 && (
          <Card className="space-y-3">
            <CardTitle>{t('values')}</CardTitle>
            <ul className="flex flex-wrap gap-2">
              {branding.brandValues.map((value) => (
                <li key={value} className="rounded-full bg-elevated px-3 py-1 text-sm">
                  {value}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {branding.brandVoice && (
          <Card className="space-y-3">
            <CardTitle>{t('voice')}</CardTitle>
            <p className="text-sm leading-relaxed text-fg-secondary">{branding.brandVoice}</p>
          </Card>
        )}
      </div>
    </div>
  )
}
