import { getTranslations } from 'next-intl/server'

import { checkedSiteColors, fontStack } from '@/lib/brand-theme'
import type { BrandFonts, BrandPalette } from '@/lib/brand-theme'
import type { GeneratedFile } from '@/server/db/schema'
import { publicUrl } from '@/server/storage/r2'

/**
 * What a locked deliverable would look like, drawn in the brand asking about it.
 *
 * A section that says "the website is on Creator and above" names the thing and
 * still leaves the customer to imagine it. These draw it instead — in their
 * palette, their faces, their mark — because the argument for the paid plan is
 * that everything agrees with everything, and that is a claim you can only make
 * by showing it.
 *
 * Two rules hold this honest, both inherited from `LogoUsage`, which draws the
 * same kind of picture for artwork that does exist:
 *
 *  - **Nothing fabricates content.** No invented domain, no invented headline,
 *    no lorem ipsum with the customer's name in it. Text that is theirs — the
 *    name, the slogan — is theirs; everything else is a bar, the way a wireframe
 *    is a bar. A mockup that writes copy is a mockup that gets quoted back.
 *  - **Colours go through `checkedSiteColors`**, the same arithmetic the real
 *    site renderer uses. A generated palette can pair a near-white primary with
 *    white paper, and a preview is exactly where that would first be seen — it
 *    would be seen as our bug rather than as their palette.
 *
 * CSS, not screenshots: it costs no assets, it follows the theme, and it cannot
 * go stale against a renderer that changes.
 */

function colors(palette: BrandPalette) {
  return checkedSiteColors({
    background: palette?.background ?? '#ffffff',
    text: palette?.text ?? '#0b1020',
    primary: palette?.primary ?? '#7240ff',
  })
}

function Mark({ logo, className }: { logo?: GeneratedFile; className: string }) {
  if (!logo) return null

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={publicUrl(logo.r2Key) ?? `/api/files/${logo.id}`}
      alt=""
      className={className}
    />
  )
}

/** The four pages a run actually produces, as a nav. */
const PAGES = ['home', 'about', 'services', 'contact'] as const

export async function WebsiteMockup({
  palette,
  fonts,
  logo,
  name,
  slogan,
  language,
}: {
  palette: BrandPalette
  fonts: BrandFonts
  logo?: GeneratedFile
  name: string
  slogan: string | null
  language: string
}) {
  const t = await getTranslations('Branding')
  const tw = await getTranslations('Website')
  const site = colors(palette)

  return (
    <figure className="space-y-2">
      {/*
        Aria-hidden, and the caption below carries the meaning. Every string
        inside is either decorative or a duplicate of something already on this
        page in a real heading — read aloud it would be a second, confusing copy
        of the brand's own name.
      */}
      <div
        aria-hidden
        className="overflow-hidden rounded-control border border-line"
        style={{ backgroundColor: site.paper }}
      >
        <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Mark logo={logo} className="size-6 shrink-0 object-contain" />
            <span
              className="truncate text-sm font-semibold"
              style={{ color: site.ink, fontFamily: fontStack(fonts?.heading) }}
            >
              {name}
            </span>
          </div>

          <div className="hidden items-center gap-4 sm:flex">
            {PAGES.map((page) => (
              <span
                key={page}
                className="text-xs"
                style={{ color: site.muted, fontFamily: fontStack(fonts?.body) }}
              >
                {tw(`pages.${page}`)}
              </span>
            ))}
          </div>
        </div>

        <div className="h-px w-full" style={{ backgroundColor: site.line }} />

        <div className="px-4 py-8 sm:px-6 sm:py-12">
          <p
            lang={language}
            dir="auto"
            className="text-balance text-xl font-semibold leading-tight sm:text-3xl"
            style={{ color: site.ink, fontFamily: fontStack(fonts?.heading) }}
          >
            {name}
          </p>

          {slogan && (
            <p
              lang={language}
              dir="auto"
              className="mt-2 max-w-[40ch] text-sm sm:text-base"
              style={{ color: site.accent, fontFamily: fontStack(fonts?.body) }}
            >
              {slogan}
            </p>
          )}

          {/* The one page every generated site has, so the button is not an
              invention. Filled with the primary, labelled in the colour that
              was checked against it. */}
          <span
            className="mt-5 inline-block rounded-full px-4 py-1.5 text-xs font-medium"
            style={{
              backgroundColor: site.primary,
              color: site.onPrimary,
              fontFamily: fontStack(fonts?.body),
            }}
          >
            {tw('pages.contact')}
          </span>
        </div>

        {/* Three sections, as bars. A wireframe is honest about being one. */}
        <div className="grid gap-3 px-4 pb-6 sm:grid-cols-3 sm:px-6 sm:pb-8">
          {[0, 1, 2].map((block) => (
            <div
              key={block}
              className="space-y-2 rounded-control p-3"
              style={{ backgroundColor: site.line }}
            >
              <div className="h-1.5 w-2/3 rounded-full" style={{ backgroundColor: site.muted }} />
              <div className="h-1.5 w-full rounded-full" style={{ backgroundColor: site.line }} />
              <div className="h-1.5 w-4/5 rounded-full" style={{ backgroundColor: site.line }} />
            </div>
          ))}
        </div>
      </div>

      <figcaption className="text-xs text-fg-muted">{t('mockupCaption')}</figcaption>
    </figure>
  )
}

/**
 * What a vector file buys, drawn as the thing it actually does: hold its edge
 * at any size.
 *
 * The hardest of the three to draw honestly, because the difference between an
 * SVG and the PNG beside it is invisible at the size a preview renders. So this
 * does not try to fake a comparison — no simulated pixellation, no
 * `image-rendering: pixelated` on a raster that would not have blurred at this
 * size anyway. It shows the mark climbing a scale ramp and labels the top of
 * the ramp with what the product already calls it everywhere else: `SVG · ∞`.
 *
 * The claim is therefore true as drawn. A mockup that invented a blurry PNG to
 * argue against would be selling with a picture of a defect the customer does
 * not have.
 */
export async function VectorMockup({
  palette,
  logo,
}: {
  palette: BrandPalette
  logo?: GeneratedFile
}) {
  const t = await getTranslations('Branding')
  const site = colors(palette)

  /* Three steps and a ceiling. The pixel figures are the raster the customer
     already has; `∞` is the one that is locked. */
  const steps = [
    { size: 'size-6', label: '32' },
    { size: 'size-12', label: '128' },
    { size: 'size-20', label: '1024' },
  ]

  return (
    <figure className="space-y-2">
      <div
        aria-hidden
        className="flex items-end justify-center gap-5 rounded-control border border-line px-4 py-8 sm:gap-8"
        style={{ backgroundColor: site.paper }}
      >
        {steps.map((step) => (
          <div key={step.label} className="flex flex-col items-center gap-2">
            {logo ? (
              <Mark logo={logo} className={`${step.size} object-contain`} />
            ) : (
              <span
                className={`${step.size} rounded-full`}
                style={{ backgroundColor: site.line }}
              />
            )}
            <span className="text-xs tabular-nums" style={{ color: site.muted }}>
              {step.label}
            </span>
          </div>
        ))}

        {/* The step that is not a number. Set in the brand's own accent so the
            locked rung is the one wearing the colour. */}
        <div className="flex flex-col items-center gap-2">
          <span
            className="grid size-20 place-items-center rounded-control border border-dashed text-3xl leading-none"
            style={{ borderColor: site.accent, color: site.accent }}
          >
            ∞
          </span>
          <span className="text-xs font-medium" style={{ color: site.accent }}>
            {t('varVector')}
          </span>
        </div>
      </div>

      <figcaption className="text-xs text-fg-muted">{t('mockupCaption')}</figcaption>
    </figure>
  )
}

export async function KitMockup({
  palette,
  fonts,
  logo,
  name,
}: {
  palette: BrandPalette
  fonts: BrandFonts
  logo?: GeneratedFile
  name: string
}) {
  const t = await getTranslations('Branding')
  const site = colors(palette)

  /*
   * Three posts, because a kit is a set and one square looks like a logo on a
   * coloured card. The grounds alternate so the set demonstrates the thing a
   * kit is actually for — the same brand holding together across frames.
   *
   * The coloured frame is typographic, and that is not a style preference. A
   * customer's logo raster is not necessarily transparent — the real kit and the
   * file list both draw one on white for that reason — so a mark dropped onto
   * the brand's primary shows up as a white box around it, which reads as our
   * bug rather than as their artwork. Real kits alternate mark frames with type
   * frames anyway; this draws that.
   */
  const frames = [
    { ground: site.paper, mark: true },
    { ground: site.primary, mark: false },
    { ground: site.paper, mark: true },
  ]

  return (
    <figure className="space-y-2">
      <div aria-hidden className="grid grid-cols-3 gap-3">
        {frames.map((frame, index) => {
          const onGround = frame.mark ? site.ink : site.onPrimary

          return (
            <div
              key={index}
              className="flex aspect-square flex-col items-center justify-center gap-2 rounded-control border border-line p-3"
              style={{ backgroundColor: frame.ground }}
            >
              {frame.mark && <Mark logo={logo} className="size-8 object-contain sm:size-10" />}
              <span
                className={`line-clamp-2 text-center font-medium leading-tight ${frame.mark ? 'text-xs' : 'text-sm'}`}
                style={{ color: onGround, fontFamily: fontStack(fonts?.heading) }}
              >
                {name}
              </span>
              <div
                className="h-1 w-10 rounded-full"
                style={{ backgroundColor: onGround, opacity: 0.4 }}
              />
            </div>
          )
        })}
      </div>

      <figcaption className="text-xs text-fg-muted">{t('mockupCaption')}</figcaption>
    </figure>
  )
}
