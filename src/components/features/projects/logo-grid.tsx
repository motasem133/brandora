import { Download } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { Card, CardTitle } from '@/components/ui/card'
import type { GeneratedFile } from '@/server/db/schema'
import { publicUrl } from '@/server/storage/r2'

export async function LogoGrid({
  logos,
  kit,
}: {
  logos: GeneratedFile[]
  kit?: GeneratedFile
}) {
  const t = await getTranslations('Branding')
  if (logos.length === 0) return null

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <CardTitle>{t('logos')}</CardTitle>
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
                className="aspect-square w-full rounded-lg border border-line bg-white object-contain"
                loading="lazy"
              />
              <figcaption className="flex items-center justify-between gap-2">
                <span className="text-xs capitalize text-fg-secondary">{style}</span>
                <a href={`/api/files/${logo.id}`} className="text-xs text-brand hover:underline">
                  {t('download')}
                </a>
              </figcaption>
            </figure>
          )
        })}
      </div>
    </Card>
  )
}
