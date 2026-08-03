import { Download } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { Card, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { GeneratedFile } from '@/server/db/schema'
import { publicUrl } from '@/server/storage/r2'
import { LogoComposer } from './logo-composer'
import { SelectLogoButton } from './logo-actions'

export async function LogoGrid({
  logos,
  kit,
  projectId,
  primaryLogoFileId,
  creditBalance,
  logoCost,
  logoBrief,
  isGenerating,
}: {
  logos: GeneratedFile[]
  kit?: GeneratedFile
  projectId: string
  primaryLogoFileId: string | null
  creditBalance: number
  logoCost: number
  logoBrief: string | null
  isGenerating: boolean
}) {
  const t = await getTranslations('Branding')
  if (logos.length === 0) return null

  /*
   * Newest round first, and every earlier one still on the page.
   *
   * Concepts generated before rounds existed carry no round number and group
   * together as round 1, which is what they were.
   */
  const byRound = new Map<number, GeneratedFile[]>()
  for (const logo of logos) {
    const round = Number(logo.metadata?.round ?? 1)
    byRound.set(round, [...(byRound.get(round) ?? []), logo])
  }

  const rounds = [...byRound.entries()]
    .sort(([a], [b]) => b - a)
    .map(([round, concepts]) => ({
      round,
      // The direction that produced this round, so an older set explains itself
      // rather than looking like an unexplained duplicate.
      brief: concepts.map((c) => c.metadata?.brief).find((b) => typeof b === 'string' && b) as
        | string
        | undefined,
      concepts,
    }))

  // Undecided falls back to the newest round's first concept, which is what the
  // rest of the system already assumes.
  const primaryId = primaryLogoFileId ?? rounds[0]?.concepts[0]?.id

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle>{t('logos')}</CardTitle>
          <p className="mt-1 text-sm text-fg-secondary">{t('logosHint')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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

      <LogoComposer
        projectId={projectId}
        brief={logoBrief}
        cost={logoCost}
        affordable={creditBalance >= logoCost}
        isRunning={isGenerating}
      />

      {rounds.map(({ round, brief, concepts }, index) => (
        <section key={round} className="space-y-3">
          {/* Only worth labelling once there is more than one round to tell
              apart. A single set of concepts needs no heading. */}
          {rounds.length > 1 && (
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-line pt-4">
              <h3 className="text-sm font-medium">
                {index === 0 ? t('latestRound') : t('earlierRound', { round })}
              </h3>
              {brief && (
                <p className="min-w-0 flex-1 truncate text-xs text-fg-muted" title={brief}>
                  {t('roundDirection', { brief })}
                </p>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {concepts.map((logo) => {
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
        </section>
      ))}
    </Card>
  )
}
