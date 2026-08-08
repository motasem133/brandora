import { ChevronDown, FileText } from 'lucide-react'
import Image from 'next/image'

import { brandTheme, fontStack } from '@/lib/brand-theme'
import type { Specimen } from './specimens'

/**
 * The kit, as a cabinet of flat-file drawers rather than a bento.
 *
 * What stood here was six cells of unequal size, each holding one deliverable
 * and every one of them painted in Brandora's own dark surface with a violet
 * lit edge. It is a good bento and that is the problem: a bento is what every
 * AI product's second section is, and painting a customer's logo, palette and
 * social posts onto our chrome says the opposite of what the section claims,
 * which is that a run produces one coherent brand.
 *
 * A drawer instead. Each one is a whole run, edge-on and wearing its own paper,
 * and the open one shows what that run left behind. Stacked, they read as a
 * cabinet a visitor could keep pulling from — which is also what the product
 * is, since `PRODUCT.md` is explicit that the account accumulates brands rather
 * than settling on one.
 *
 * `<details>` rather than state. It is open and closed for free, it is correct
 * for a keyboard and a screen reader without a single aria attribute, and it
 * works before hydration — so this section is not another 4000 pixels of the
 * page that depends on JavaScript having arrived.
 */
export function BrandDrawer({
  specimen,
  open,
  labels,
}: {
  specimen: Specimen
  /** The first drawer starts open. A cabinet with every drawer shut shows nothing. */
  open?: boolean
  labels: {
    logos: string
    logosNote: string
    logoAlt: string
    posts: string
    postAlt: string
    values: string
    type: string
    headingFont: string
    bodyFont: string
    pdf: string
  }
}) {
  const theme = brandTheme(specimen.palette)

  return (
    <details
      open={open}
      style={theme.vars}
      className="group overflow-hidden rounded-card bg-[var(--guest-paper)] ring-1 ring-[var(--guest-line)]"
    >
      {/*
        The drawer front: the name, the line, and the palette as a colour tab
        along the end. Closed, that tab is the only thing distinguishing one
        drawer from the next, which is exactly how a chip book is read.
      */}
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-8 gap-y-4 p-6 sm:px-8 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          <p
            style={{ fontFamily: fontStack(specimen.fonts.heading) }}
            className="text-2xl font-semibold tracking-[-0.02em] text-[var(--guest-ink)]"
          >
            {specimen.name}
          </p>
          <p
            style={{ fontFamily: fontStack(specimen.fonts.body) }}
            className="mt-1 max-w-[52ch] text-sm text-[var(--guest-ink-soft)]"
          >
            {specimen.line}
          </p>
        </div>

        <div aria-hidden className="flex items-center gap-4">
          {/* No text on a swatch, here or anywhere: a generated colour is the
              one thing on this page nobody has checked a ratio against.

              The inset hairline is not decoration. A palette's background
              member is by definition close to the paper it is printed on, so
              Sultana's fourth chip was a cream disc on cream and the tab read
              as three colours rather than four. The ring separates the chips
              from each other; this separates a chip from the ground. */}
          <div className="flex">
            {specimen.swatches.map((hex) => (
              <span
                key={hex}
                style={{ backgroundColor: hex }}
                className="-ms-2 size-7 rounded-full shadow-[inset_0_0_0_1px_var(--guest-line)] ring-2 ring-[var(--guest-paper)] first:ms-0"
              />
            ))}
          </div>
          <ChevronDown className="size-5 text-[var(--guest-ink-faint)] transition-transform group-open:rotate-180" />
        </div>
      </summary>

      <div className="grid gap-10 border-t border-[var(--guest-line)] p-6 sm:p-8">
        {specimen.logos.length > 0 && (
          <section>
            <p className="text-sm text-[var(--guest-ink-faint)]">{labels.logos}</p>
            {/*
              On the brand's own paper, not on white tiles.

              The bento put every mark on `bg-white/95`, which is a fifth colour
              nobody generated, and it printed a cream rectangle inside a white
              one for any brand whose paper is not white. A mark is drawn to sit
              on its brand's ground; this is that ground.
            */}
            {/*
              `overflow-hidden` on the tile and `size-full` on the image, not
              `max-h-full`.

              A max-height on the image alone does not bind it: the tile is a
              fixed 7rem, the image carries its own intrinsic ratio, and a
              1200x792 seal rendered at the tile's width came out 180px taller
              than the box it was in. Two of the four marks burst their tiles
              and printed on top of the caption underneath.
            */}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {specimen.logos.map((logo) => (
                <div
                  key={logo.src}
                  className="h-28 overflow-hidden rounded-control ring-1 ring-[var(--guest-line)]"
                >
                  <Image
                    src={logo.src}
                    alt={labels.logoAlt}
                    width={logo.width}
                    height={logo.height}
                    className="size-full object-contain p-4"
                    sizes="200px"
                  />
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-[var(--guest-ink-faint)]">{labels.logosNote}</p>
          </section>
        )}

        {specimen.posts.length > 0 && (
          <section>
            <p className="text-sm text-[var(--guest-ink-faint)]">{labels.posts}</p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {specimen.posts.map((post) => (
                <Image
                  key={post}
                  src={post}
                  alt={labels.postAlt}
                  width={1080}
                  height={1080}
                  className="w-full rounded-control ring-1 ring-[var(--guest-line)]"
                  sizes="(max-width: 640px) 30vw, 240px"
                />
              ))}
            </div>
          </section>
        )}

        {specimen.values.length > 0 && (
          <section>
            <p className="text-sm text-[var(--guest-ink-faint)]">{labels.values}</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {specimen.values.map((value) => (
                <li
                  key={value}
                  style={{ fontFamily: fontStack(specimen.fonts.body) }}
                  className="rounded-full px-4 py-1.5 text-sm text-[var(--guest-ink)] ring-1 ring-[var(--guest-line)]"
                >
                  {value}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <p className="text-sm text-[var(--guest-ink-faint)]">{labels.type}</p>
          <dl className="mt-4 grid gap-x-10 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-[0.08em] text-[var(--guest-ink-faint)]">
                {labels.headingFont}
              </dt>
              <dd
                style={{ fontFamily: fontStack(specimen.fonts.heading) }}
                className="mt-1 text-2xl text-[var(--guest-ink)]"
              >
                {specimen.fonts.heading}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.08em] text-[var(--guest-ink-faint)]">
                {labels.bodyFont}
              </dt>
              <dd
                style={{ fontFamily: fontStack(specimen.fonts.body) }}
                className="mt-1 text-2xl text-[var(--guest-ink)]"
              >
                {specimen.fonts.body}
              </dd>
            </div>
          </dl>
        </section>

        {/*
          The document itself, not a picture of it. It is the real file the run
          produced, so the claim can be checked rather than believed.
        */}
        {specimen.pdf && (
          <a
            href={specimen.pdf}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-2 rounded-control px-4 py-2.5 text-sm text-[var(--guest-ink)] ring-1 ring-[var(--guest-line)] transition-colors hover:bg-[var(--guest-accent)]/10"
          >
            <FileText className="size-4" />
            {labels.pdf}
          </a>
        )}
      </div>
    </details>
  )
}
