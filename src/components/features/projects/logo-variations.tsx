import { Lock, X } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { Disclosure } from '@/components/ui/disclosure'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Link } from '@/i18n/navigation'
import { brandTheme, fontStack, type BrandFonts, type BrandPalette } from '@/lib/brand-theme'
import { cn } from '@/lib/utils'
import type { GeneratedFile } from '@/server/db/schema'
import { publicUrl } from '@/server/storage/r2'

/**
 * Every file that exists for the chosen logo, shown where it is going to live.
 *
 * These were all being produced already — favicon, avatars at four sizes, the
 * social card, the monochrome mark, the traced SVG — and none of them were
 * visible anywhere. The only way to see one was to download the brand kit ZIP
 * and open it, which is a poor way to find out that the favicon is wrong.
 *
 * The first version of this put all of them in one grid of equal tiles, each
 * drawn at its true pixel size on a white plate. Both halves of that were
 * defensible and both were wrong in practice:
 *
 * - **True scale made the favicon look broken.** A 32px image centred in a
 *   176px plate covers 3% of it and reads as a failed load. It was honest about
 *   size and useless about the only question anyone asks of a favicon, which is
 *   whether the mark survives being that small.
 * - **Four avatar sizes were four near-identical tiles**, and with the logo,
 *   the vector, the icon and the monochrome beside them the section was ten
 *   squares of the same artwork. DESIGN.md names a grid of same-size cards as
 *   its anti-reference, and this was one.
 * - **Every plate was forced white**, on the one surface in the product showing
 *   a brand's own marks. Paper White is what a brand *without* a ground gets;
 *   here the brand has one.
 *
 * So: the marks that are artwork are shown as artwork on the brand's own paper,
 * and everything derived is shown inside the thing it was cut for — a browser
 * tab, a profile row, a shared link. Scale stops being a caption and becomes
 * the picture. Nothing was dropped; every file is still one click from here.
 */

type Props = {
  files: GeneratedFile[]
  primaryLogoFileId: string | null
  markLogoFileId: string | null
  /** The brand's own palette. Absent falls back to white paper — see `brandTheme`. */
  palette?: BrandPalette
  /** Sets the brand's name in its own face inside the mock scenes. */
  fonts?: BrandFonts
  /** What the tab and the profile row are named. Falls back to the label alone. */
  brandName?: string | null
  /** The published site, for the link unfurl. Absent shows no domain line. */
  domain?: string | null
  /**
   * Whether this project's owner has paid for the vector.
   *
   * `/api/files` refuses `logo_svg` to a plan without `vectorExport`, and this
   * panel listed it regardless: the plate drew a broken image — the bucket is
   * private, so the `<img>` source is that same route — beside a Download link
   * that navigated to a page of JSON. A customer reported exactly that. The
   * gate is enforced on the route either way; this only stops the page offering
   * what the route will refuse. The support view passes `true`, because an
   * administrator is exempt there for the same reason it is exempt here.
   */
  vectorExport: boolean
  /** Folded shut for a customer, open on the support view — see below. */
  open?: boolean
}

function dimensions(file: GeneratedFile) {
  return file.width && file.height ? `${file.width}×${file.height}` : null
}

function fileSrc(file: GeneratedFile) {
  return publicUrl(file.r2Key) ?? `/api/files/${file.id}`
}

/**
 * A download that is a row action rather than a link inside a sentence, so
 * WCAG 2.5.8's inline exception does not cover it. The floor is 24px.
 */
function DownloadLink({ file, children }: { file: GeneratedFile; children: React.ReactNode }) {
  return (
    <a
      href={`/api/files/${file.id}?download`}
      className="inline-flex min-h-6 shrink-0 items-center text-xs accent-text hover:underline"
    >
      {children}
    </a>
  )
}

/** A mark shown as artwork: fitted to the plate, on the brand's own ground. */
function MarkPlate({
  file,
  label,
  detail,
  download,
  locked,
}: {
  file: GeneratedFile
  label: string
  detail: string
  download: string
  /** Sold, not owned: a lock and a way to buy it, in place of the file. */
  locked?: { label: string }
}) {
  return (
    <figure className="space-y-2">
      <div
        className={cn(
          'grid place-items-center overflow-hidden rounded-control p-6',
          'bg-[var(--guest-paper)] ring-1 ring-[var(--guest-line)]',
        )}
        style={{ minHeight: 168 }}
      >
        {/* No <img> when it is locked: its source is a route that answers 403
            for this file, so the only thing it could draw is a broken image. */}
        {locked ? (
          <Lock className="size-5 text-fg-muted" aria-hidden />
        ) : (
        <>
          {/* Generated assets are arbitrary user content, so next/image
              optimisation is skipped in favour of a plain img. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fileSrc(file)}
            alt={label}
            width={file.width ?? undefined}
            height={file.height ?? undefined}
            loading="lazy"
            /*
             * Fitted rather than pinned to its own pixel width. The old rule drew
             * everything at true size to stop a 32px favicon reading as a
             * full-size logo; the derived files have their own scenes below now,
             * so what is left here is artwork worth seeing at a usable size, and
             * the pixel dimensions are in the caption where they can be read.
             *
             * Both bounds are pixel values, deliberately. `max-h-full` was tried
             * first and measured wrong in a browser — a 1024 mark laid out 244px
             * tall inside a 176px plate — because the percentage never resolved
             * against the plate. A number cannot fail to.
             */
            className="max-w-full object-contain"
            style={{ maxHeight: 120 }}
          />
        </>
        )}
      </div>
      <figcaption>
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-xs font-medium">{label}</span>
          {locked ? (
            /* Where every other locked surface in the product points. */
            <Link
              href="/dashboard/billing"
              className="inline-flex min-h-6 shrink-0 items-center text-xs accent-text hover:underline"
            >
              {locked.label}
            </Link>
          ) : (
            <DownloadLink file={file}>{download}</DownloadLink>
          )}
        </div>
        <p className="text-xs text-fg-muted">{detail}</p>
      </figcaption>
    </figure>
  )
}

/**
 * One browser tab, drawn.
 *
 * The colours here are literals and they are the one legitimate place for them:
 * they depict Chrome's own chrome, which is not ours to hold a token for. Light
 * and dark are both shown because both ship, and a mark that disappears on one
 * of them is exactly the defect this section exists to surface — at 16px, which
 * is the size a tab actually renders a favicon.
 */
function BrowserTab({
  file,
  name,
  dark,
}: {
  file: GeneratedFile
  name: string
  dark?: boolean
}) {
  return (
    <div
      className="rounded-t-control px-2 pt-2"
      style={{ backgroundColor: dark ? '#202124' : '#dee1e6' }}
    >
      <div
        className="flex items-center gap-2 rounded-t-[0.5rem] px-3 py-2"
        style={{ backgroundColor: dark ? '#35363a' : '#ffffff' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fileSrc(file)}
          alt=""
          width={16}
          height={16}
          loading="lazy"
          className="shrink-0 object-contain"
          style={{ width: 16, height: 16 }}
        />
        <span
          className="truncate text-xs"
          style={{ color: dark ? '#e8eaed' : '#3c4043' }}
        >
          {name}
        </span>
        <X className="ms-auto size-3 shrink-0" style={{ color: dark ? '#9aa0a6' : '#5f6368' }} />
      </div>
    </div>
  )
}

/**
 * A scene: the derived file inside the thing it was cut for, with every size of
 * it reachable underneath.
 */
function Scene({
  title,
  hint,
  files,
  sized,
  children,
}: {
  title: string
  hint: string
  files: GeneratedFile[]
  /** Labels each download by its pixel width, for a file that ships at several. */
  sized?: boolean
  children: React.ReactNode
}) {
  return (
    <figure className="space-y-3">
      <div>{children}</div>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-xs font-medium">{title}</span>
        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {files.map((file) => (
            <DownloadLink key={file.id} file={file}>
              {sized ? (file.width ?? dimensions(file) ?? '—') : dimensions(file) ?? 'PNG'}
            </DownloadLink>
          ))}
        </span>
        <p className="w-full text-xs text-fg-muted">{hint}</p>
      </figcaption>
    </figure>
  )
}

export async function LogoVariations({
  files,
  primaryLogoFileId,
  markLogoFileId,
  vectorExport,
  palette,
  fonts,
  brandName,
  domain,
  open,
}: Props) {
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

  const favicons = byVariant('favicon')
  const avatars = byVariant('avatar').sort((a, b) => (b.width ?? 0) - (a.width ?? 0))
  const cards = byVariant('og')
  const monochrome = byVariant('monochrome')

  /*
   * Files written before variants were labelled carry no metadata. Rather than
   * guess at their filenames, they are listed plainly — every one of them is
   * replaced the next time a logo or icon is chosen.
   */
  const unlabelled = derived.filter((file) => !file.metadata?.variant)

  /*
   * Whether the small square formats were actually cut from the icon.
   *
   * Read from the files rather than from `markLogoFileId`, because that column
   * only records a customer *choosing* an icon — and the pipeline picks one for
   * them whenever the chosen logo is a wordmark, since a wordmark at 32 pixels
   * is a smudge. On every brand where nobody pressed that button the hint
   * therefore read "pick an icon above to use a text-free mark", printed
   * directly above scenes already using one, and the mark in them is visibly
   * not the chosen logo. That reads as the favicon showing the wrong artwork,
   * and it was reported as exactly that. `source` is written by
   * `derivePrimaryAssets` and records what each file was really cut from.
   */
  const cutFromIcon = derived.some((file) => file.metadata?.source === 'icon')

  /**
   * Said at the scene rather than on a tile.
   *
   * This began as a suffix on a per-file caption, back when every derived file
   * was its own plate in a grid. The scenes replaced that grid, so the sentence
   * belongs on the scene — which is where the picture it explains now is.
   */
  const from = (file: GeneratedFile | undefined) =>
    file?.metadata?.source === 'icon' ? t('usageFromIcon') : t('usageFromFullLogo')

  const theme = brandTheme(palette ?? null)
  const name = brandName?.trim() || t('varFullLogo')

  /* Marks are artwork; everything below is a file with a destination. */
  const marks: {
    file: GeneratedFile
    label: string
    detail: string
    locked?: { label: string }
  }[] = [{ file: logo, label: t('varFullLogo'), detail: `PNG · ${dimensions(logo) ?? '—'}` }]
  if (svg) {
    marks.push({
      file: svg,
      label: t('varVector'),
      detail: vectorExport ? 'SVG · ∞' : t('varVectorLocked'),
      locked: vectorExport ? undefined : { label: t('unlock') },
    })
  }
  // Choosing one concept as both is allowed — it means "use the logo where text
  // will not fit" — but it is one piece of artwork, so it gets one plate.
  if (mark && mark.id !== logo.id) {
    marks.push({ file: mark, label: t('varIcon'), detail: `PNG · ${dimensions(mark) ?? '—'}` })
  }
  for (const file of monochrome) {
    marks.push({ file, label: t('varMonochrome'), detail: `PNG · ${dimensions(file) ?? '—'}` })
  }

  const total =
    marks.length + favicons.length + avatars.length + cards.length + unlabelled.length

  const avatar = avatars[0]
  const favicon = favicons[0]
  const card = cards[0]
  const hasScenes = Boolean(favicon || avatar || card)

  /*
   * Folded shut by default.
   *
   * These are consulted — "is the favicon right?" — not decided on, and open
   * they were a screenful of near-identical tiles between the palette and
   * everything below it.
   *
   * The support view opens it, because there the question is the whole reason
   * for the screen: somebody is looking for the favicon, and a fold that hides
   * it is the same as not having it on the page.
   */
  return (
    <Disclosure title={t('variations')} meta={t('fileCount', { count: total })} open={open}>
      <p className="text-sm text-fg-secondary">
        {cutFromIcon ? t('variationsHintWithIcon') : t('variationsHint')}
      </p>

      {/* The brand's ground travels through CSS rather than through props, so
          every plate and every scene below inherits it from one declaration. */}
      <div style={theme.vars} className="mt-6 space-y-8">
        <section className="space-y-3">
          <Eyebrow as="h3" className="text-fg-muted">
            {t('varsMarks')}
          </Eyebrow>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {marks.map(({ file, label, detail, locked }) => (
              <MarkPlate
                key={`${label}:${file.id}`}
                file={file}
                label={label}
                detail={detail}
                download={t('download')}
                locked={locked}
              />
            ))}
          </div>
        </section>

        {hasScenes && (
          <section className="space-y-3">
            <Eyebrow as="h3" className="text-fg-muted">
              {t('varsInUse')}
            </Eyebrow>

            {/*
              Three different shapes, deliberately. A tab, a profile row and an
              unfurl are not the same object, and drawing them as three equal
              cards would put back the grid this section was rebuilt to lose.
            */}
            <div className="grid gap-6 lg:grid-cols-2">
              {favicon && (
                <Scene
                  title={t('varFavicon')}
                  hint={`${t('varFaviconHint')} · ${from(favicon)}`}
                  files={favicons}
                >
                  <div className="flex items-end gap-3">
                    <div className="min-w-0 flex-1">
                      <BrowserTab file={favicon} name={name} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <BrowserTab file={favicon} name={name} dark />
                    </div>
                  </div>
                </Scene>
              )}

              {avatar && (
                <Scene
                  title={t('varAvatar')}
                  hint={`${t('varAvatarHint')} · ${from(avatar)}`}
                  files={avatars}
                  sized
                >
                  <div
                    className={cn(
                      'flex items-center gap-3 rounded-control p-4',
                      'bg-[var(--guest-paper)] ring-1 ring-[var(--guest-line)]',
                    )}
                  >
                    {/*
                      Circle-cropped, because that is what every platform does
                      to it — and it is the one view that shows a mark drawn
                      without breathing room losing its edges.
                    */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={fileSrc(avatar)}
                      alt=""
                      loading="lazy"
                      className="size-12 shrink-0 rounded-full object-cover"
                    />
                    <div className="min-w-0">
                      <p
                        className="truncate text-sm font-semibold"
                        style={{
                          color: 'var(--guest-ink)',
                          fontFamily: fontStack(fonts?.heading),
                        }}
                      >
                        {name}
                      </p>
                      <p className="truncate text-xs" style={{ color: 'var(--guest-ink-soft)' }}>
                        {domain ?? t('varAvatarHandle')}
                      </p>
                    </div>
                  </div>
                </Scene>
              )}

              {card && (
                <Scene
                  title={t('varSocialCard')}
                  hint={t('varSocialCardHint')}
                  files={cards}
                >
                  <div className="overflow-hidden rounded-control ring-1 ring-line">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={fileSrc(card)}
                      alt=""
                      loading="lazy"
                      className="block w-full object-cover"
                      style={{ aspectRatio: '1200 / 630' }}
                    />
                    <div className="bg-raised px-4 py-3">
                      <p className="truncate text-xs uppercase tracking-[0.12em] text-fg-muted">
                        {domain ?? t('varSocialCardFallbackDomain')}
                      </p>
                      <p className="truncate text-sm font-medium">{name}</p>
                    </div>
                  </div>
                </Scene>
              )}
            </div>
          </section>
        )}

        {unlabelled.length > 0 && (
          <section className="space-y-3">
            <Eyebrow as="h3" className="text-fg-muted">
              {t('varsOther')}
            </Eyebrow>
            <ul className="divide-y divide-line border-y border-line">
              {unlabelled.map((file) => (
                <li key={file.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="flex min-w-0 items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={fileSrc(file)}
                      alt=""
                      loading="lazy"
                      className="size-8 shrink-0 rounded-[0.25rem] bg-[var(--guest-paper)] object-contain p-1"
                    />
                    <span className="truncate text-xs text-fg-muted">
                      {dimensions(file) ?? 'PNG'}
                    </span>
                  </span>
                  <DownloadLink file={file}>{t('download')}</DownloadLink>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Disclosure>
  )
}
