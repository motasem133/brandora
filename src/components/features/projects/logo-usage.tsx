import { Lock, X } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { Card, CardTitle } from '@/components/ui/card'
import type { GeneratedFile } from '@/server/db/schema'
import { publicUrl } from '@/server/storage/r2'

/**
 * What the choices on this page actually produce.
 *
 * "Use as icon" was a button whose consequence lived in a ZIP file. Nobody —
 * including the person who built it — could say from the screen what pressing
 * it changed, so the control read as a setting with no effect. These are the
 * three places the artwork ends up, drawn at the size and shape they are
 * really used at: a favicon is 32 pixels whether or not the wordmark fits, and
 * seeing that is the whole argument for picking a text-free mark.
 *
 * The frames are CSS, not screenshots, so they follow the theme and cost no
 * assets. Nothing here invents a domain or a handle: a mockup that fabricates
 * a URL is a mockup that gets believed.
 */
export async function LogoUsage({
  files,
  businessName,
  slogan,
}: {
  files: GeneratedFile[]
  businessName: string | null
  slogan: string | null
  /** Whether a text-free mark was chosen, or the logo is standing in for one. */
}) {
  const t = await getTranslations('Branding')

  const src = (file: GeneratedFile) => publicUrl(file.r2Key) ?? `/api/files/${file.id}`
  const byVariant = (variant: string) =>
    files.filter((file) => file.metadata?.variant === variant)

  const favicon = byVariant('favicon')[0]
  // The largest avatar, so the circle is never upscaled from a 128px cut.
  const avatar = byVariant('avatar').sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]
  const card = byVariant('og')[0]

  // Derived files only exist once a logo has been chosen and rebuilt from.
  if (!favicon && !avatar && !card) return null

  const name = businessName || t('varFullLogo')

  return (
    <Card className="space-y-4">
      <div>
        <CardTitle>{t('usage')}</CardTitle>
        <p className="mt-1 text-sm text-fg-secondary">{t('usageHint')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {favicon && (
          /* Column, so the caption sits on the bottom edge of the row however
             tall the frame beside it turns out to be. */
          <figure className="flex h-full flex-col gap-2">
            {/* A browser window, cropped to the only part that shows a favicon. */}
            <div className="flex-1 overflow-hidden rounded-control border border-line bg-elevated/50">
              <div className="flex items-end gap-1 px-2 pt-2">
                {/* eslint-disable-next-line no-restricted-syntax --
                    A drawing of a browser tab, not a control in this product.
                    Its corner is the browser's, and 8px is what a browser uses. */}
                <div className="flex min-w-0 items-center gap-1.5 rounded-t-lg bg-surface px-2.5 py-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src(favicon)}
                    alt=""
                    className="size-4 shrink-0 rounded-[3px] bg-white object-contain"
                  />
                  <span className="truncate text-xs text-fg-secondary">{name}</span>
                  <X className="size-2.5 shrink-0 text-fg-muted" />
                </div>
                {/* eslint-disable-next-line no-restricted-syntax -- as above */}
                <div className="h-6 w-12 rounded-t-lg bg-surface/40" />
              </div>

              <div className="border-t border-line bg-surface p-2">
                <div className="flex items-center gap-1.5 rounded-full bg-elevated px-2.5 py-1">
                  <Lock className="size-2.5 text-fg-muted" />
                  <div className="h-1.5 w-24 rounded-full bg-line-strong" />
                </div>
              </div>
            </div>
            <figcaption className="text-xs text-fg-secondary">
              {t('usageTab')} <span className="text-fg-muted">· {t('usageFromIcon')}</span>
            </figcaption>
          </figure>
        )}

        {avatar && (
          <figure className="flex h-full flex-col gap-2">
            <div className="flex flex-1 items-center gap-3 rounded-control border border-line bg-elevated/50 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src(avatar)}
                alt=""
                className="size-14 shrink-0 rounded-full bg-white object-contain p-1"
              />
              <div className="min-w-0 space-y-1.5">
                <p className="truncate text-sm font-medium">{name}</p>
                <div className="h-1.5 w-20 rounded-full bg-line-strong" />
                <div className="h-1.5 w-14 rounded-full bg-line" />
              </div>
            </div>
            <figcaption className="text-xs text-fg-secondary">
              {t('usageAvatar')} <span className="text-fg-muted">· {t('usageFromIcon')}</span>
            </figcaption>
          </figure>
        )}

        {card && (
          /* Held to the width a shared link actually renders at. Stretched
             across the card it read as a hero image rather than as a preview
             of something small that appears in someone else's feed. */
          <figure className="max-w-sm space-y-2 sm:col-span-2">
            <div className="overflow-hidden rounded-control border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src(card)}
                alt=""
                className="aspect-[1200/630] w-full bg-white object-cover"
              />
              <div className="space-y-1 bg-elevated/50 p-3">
                <p className="truncate text-sm font-medium">{name}</p>
                {slogan && <p className="truncate text-xs text-fg-secondary">{slogan}</p>}
              </div>
            </div>
            <figcaption className="text-xs text-fg-secondary">
              {t('usageCard')} <span className="text-fg-muted">· {t('usageFromLogo')}</span>
            </figcaption>
          </figure>
        )}
      </div>

      {/*
        Which artwork the small formats are cut from, in words, next to the
        proof. Without a chosen mark this says so plainly rather than leaving
        the customer to infer it from a control they never pressed.
      */}
      <p className="border-t border-line pt-4 text-sm text-fg-secondary">
        {t('usageFromLogo')}
      </p>
    </Card>
  )
}
