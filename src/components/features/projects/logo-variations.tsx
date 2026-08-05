import { getTranslations } from 'next-intl/server'

import { Disclosure } from '@/components/ui/disclosure'
import type { GeneratedFile } from '@/server/db/schema'
import { publicUrl } from '@/server/storage/r2'

/**
 * Every file that exists for the chosen logo, in one place.
 *
 * These were all being produced already — favicon, avatars at four sizes, the
 * social card, the monochrome mark, the traced SVG — and none of them were
 * visible anywhere. The only way to see one was to download the brand kit ZIP
 * and open it, which is a poor way to find out that the favicon is wrong.
 */

type Variation = {
  file: GeneratedFile
  label: string
  detail: string
  /** Small marks look lost on a large tile; large ones need the room. */
  wide?: boolean
}

/*
 * One file can legitimately appear under two labels — the same concept chosen
 * as both the logo and the icon — so the file id alone is not a unique key.
 */
const keyOf = (variation: Variation) => `${variation.label}:${variation.file.id}`

function dimensions(file: GeneratedFile) {
  return file.width && file.height ? `${file.width}×${file.height}` : null
}

export async function LogoVariations({
  files,
  primaryLogoFileId,
  markLogoFileId,
}: {
  files: GeneratedFile[]
  primaryLogoFileId: string | null
  markLogoFileId: string | null
}) {
  const t = await getTranslations('Branding')

  const logo = files.find((file) => file.id === primaryLogoFileId)
  // Until a logo is chosen there is nothing to show variations of: the derived
  // files belong to whichever concept the pipeline picked, not to a decision.
  if (!logo) return null

  const mark = files.find((file) => file.id === markLogoFileId)

  /*
   * The SVG traced from the chosen concept, matched on the raster it came from
   * rather than on style, so a later round's wordmark never resolves to an
   * earlier round's trace.
   */
  const svg = files.find(
    (file) => file.kind === 'logo_svg' && file.metadata?.tracedFrom === logo.r2Key,
  )

  const derived = files.filter(
    (file) => file.kind === 'favicon' || file.kind === 'social_avatar',
  )

  const byVariant = (variant: string) =>
    derived.filter((file) => file.metadata?.variant === variant)

  const variations: Variation[] = []

  variations.push({ file: logo, label: t('varFullLogo'), detail: `PNG · ${dimensions(logo) ?? '—'}` })
  if (svg) variations.push({ file: svg, label: t('varVector'), detail: 'SVG · ∞' })

  // Choosing one concept as both is allowed — it means "use the logo where text
  // will not fit" — but it is one piece of artwork, so it gets one tile.
  if (mark && mark.id !== logo.id) {
    variations.push({ file: mark, label: t('varIcon'), detail: `PNG · ${dimensions(mark) ?? '—'}` })
  }

  for (const file of byVariant('favicon')) {
    variations.push({ file, label: t('varFavicon'), detail: `PNG · ${dimensions(file) ?? '32×32'}` })
  }

  for (const file of byVariant('avatar').sort((a, b) => (b.width ?? 0) - (a.width ?? 0))) {
    variations.push({ file, label: t('varAvatar'), detail: `PNG · ${dimensions(file) ?? '—'}` })
  }

  for (const file of byVariant('og')) {
    variations.push({ file, label: t('varSocialCard'), detail: 'PNG · 1200×630', wide: true })
  }

  for (const file of byVariant('monochrome')) {
    variations.push({ file, label: t('varMonochrome'), detail: 'PNG' })
  }

  /*
   * Files written before variants were labelled carry no metadata. Rather than
   * guess at their filenames, they are listed plainly — every one of them is
   * replaced the next time a logo or icon is chosen.
   */
  for (const file of derived.filter((f) => !f.metadata?.variant)) {
    variations.push({ file, label: t('varOther'), detail: `PNG · ${dimensions(file) ?? '—'}` })
  }

  /*
   * Folded shut by default.
   *
   * These are consulted — "is the favicon right?" — not decided on, and open
   * they were a screenful of near-identical tiles between the palette and
   * everything below it.
   */
  return (
    <Disclosure title={t('variations')} meta={t('fileCount', { count: variations.length })}>
      <p className="text-sm text-fg-secondary">
        {mark ? t('variationsHintWithIcon') : t('variationsHint')}
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {variations.map((variation) => {
          const { file, label, detail, wide } = variation
          const src = publicUrl(file.r2Key) ?? `/api/files/${file.id}`

          return (
            <figure
              key={keyOf(variation)}
              className={wide ? 'space-y-2 sm:col-span-2' : 'space-y-2'}
            >
              {/* Generated assets are arbitrary user content, so next/image
                  optimisation is skipped in favour of a plain img. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={label}
                className="aspect-square w-full rounded-control border border-line bg-white object-contain p-2"
                loading="lazy"
              />
              <figcaption>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium">{label}</span>
                  <a
                    href={`/api/files/${file.id}`}
                    /* A row action, not a link inside a sentence, so WCAG
                       2.5.8's inline exception does not cover it. Measured
                       59x16; the floor is 24. */
                    className="inline-flex min-h-6 shrink-0 items-center text-xs accent-text hover:underline"
                  >
                    {t('download')}
                  </a>
                </div>
                <p className="text-xs text-fg-muted">{detail}</p>
              </figcaption>
            </figure>
          )
        })}
      </div>
    </Disclosure>
  )
}
