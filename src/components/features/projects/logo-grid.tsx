import { Download } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { Card, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { GeneratedFile } from '@/server/db/schema'
import { publicUrl } from '@/server/storage/r2'
import { RegenerateLogosButton, SelectLogoButton } from './logo-actions'

export async function LogoGrid({
  logos,
  kit,
  projectId,
  primaryLogoFileId,
  creditBalance,
  logoCost,
}: {
  logos: GeneratedFile[]
  kit?: GeneratedFile
  projectId: string
  primaryLogoFileId: string | null
  creditBalance: number
  logoCost: number
}) {
  const t = await getTranslations('Branding')
  if (logos.length === 0) return null

  // Undecided falls back to the first concept, which is what the rest of the
  // system already assumes.
  const primaryId = primaryLogoFileId ?? logos[0]?.id

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle>{t('logos')}</CardTitle>
          <p className="mt-1 text-sm text-fg-secondary">{t('logosHint')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RegenerateLogosButton
            projectId={projectId}
            cost={logoCost}
            affordable={creditBalance >= logoCost}
          />
          {kit && (
            <a
              href={`/api/files/${kit.id}`}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-brand-fg hover:opacity-90"
            >
              <Download className="size-4" />
              {t('downloadKit')}
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {logos.map((logo) => {
          const style = String(logo.metadata?.style ?? '')
          // Public URL when the bucket is CDN-backed, otherwise the signed route.
          const src = publicUrl(logo.r2Key) ?? `/api/files/${logo.id}`

          return (
            <figure key={logo.id} className="space-y-2">
              {/* Generated assets are arbitrary user content, so next/image
                  optimisation is skipped in favour of a plain img. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={style || 'Logo concept'}
                className={cn(
                  'aspect-square w-full rounded-lg border-2 bg-white object-contain transition-colors',
                  logo.id === primaryId ? 'border-brand' : 'border-line',
                )}
                loading="lazy"
              />
              <figcaption className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs capitalize text-fg-secondary">{style}</span>
                  <a href={`/api/files/${logo.id}`} className="text-xs text-brand hover:underline">
                    {t('download')}
                  </a>
                </div>
                <SelectLogoButton
                  projectId={projectId}
                  fileId={logo.id}
                  isPrimary={logo.id === primaryId}
                />
              </figcaption>
            </figure>
          )
        })}
      </div>
    </Card>
  )
}
