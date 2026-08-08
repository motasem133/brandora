'use client'

import Image from 'next/image'
import * as React from 'react'

import { brandTheme, fontStack } from '@/lib/brand-theme'
import type { BrandPalette } from '@/lib/brand-theme'
import { cn } from '@/lib/utils'

/**
 * The fold, wearing a customer's brand instead of ours.
 *
 * The page used to argue for coherence in Brandora's own violet and then show a
 * screenshot of the dashboard, which is the composition every AI product ships:
 * a gradient headline over a picture of the app. It is also the one thing this
 * product can replace with something no template can fake, because the mechanic
 * is already built — `brandTheme` turns a generated palette into a checked
 * surface, and four screens behind the login are painted with it. Pointing it at
 * the landing page costs a component and proves the claim by performing it.
 *
 * So the chrome carries no colour and this does: paper, ink, accent, hairline
 * and type all come from the run that produced the brand, and swapping repaints
 * every one of them at once. A visitor who presses the second chip is watching
 * the product's actual output mechanism, not a carousel of screenshots.
 */

export type Specimen = {
  id: string
  /** The brand's own name, never translated: it is the output, not our copy. */
  name: string
  /** One line about it. See the note at the call site on which is which. */
  line: string
  palette: NonNullable<BrandPalette>
  /** The palette as the run wrote it, laid along the base of the plate. */
  swatches: string[]
  fonts: { heading: string; body: string }
  /**
   * A real file from the run, when one has been exported to `public/`. Absent
   * for a brand whose logo files only exist in R2 — the plate then sets the
   * name in the brand's own heading face rather than showing a mark we would
   * have had to draw, which would make the "real output" claim false.
   */
  mark?: { src: string; width: number; height: number }
}

export function BrandStage({
  specimens,
  labels,
  className,
}: {
  specimens: Specimen[]
  labels: {
    swap: string
    wall: string
    palette: string
    headingFont: string
    bodyFont: string
    markAlt: string
  }
  className?: string
}) {
  const [active, setActive] = React.useState(0)
  const specimen = specimens[active]
  const theme = brandTheme(specimen.palette)

  return (
    <div className={className}>
      {/*
        Every colour below this line comes from `theme.vars`, which is why the
        plate is safe to hand a palette nobody has looked at: `--guest-ink`,
        `--guest-ink-soft` and `--guest-ink-faint` are each resolved against
        this paper and stepped until they clear 4.5:1, rather than being the
        palette's `text` value used raw.
      */}
      <div
        style={theme.vars}
        className="overflow-hidden rounded-panel bg-[var(--guest-paper)] ring-1 ring-[var(--guest-line)] transition-colors duration-500"
      >
        {/* Keyed on the brand, so the contents cut over while the ground eases.
            `animate-fade-in` collapses to a single frame under reduced motion,
            like everything else in this system. */}
        <div key={specimen.id} className="animate-fade-in">
          <div className="grid gap-x-12 gap-y-8 p-8 sm:p-12 lg:grid-cols-[1.15fr_1fr] lg:items-center">
            {/*
              The brand says its own name, once.

              This slot held the mark and the column beside it repeated the name
              as a heading, so Sultana's plate printed "Sultana" twice, six
              inches apart, in two different faces. The mark is the name when
              there is one; the name is set in the brand's heading face when
              there is not.

              A lot of air around it either way. A logo shown small is a logo
              shown as an icon, and the claim here is that the run produces
              something worth hanging.
            */}
            <div className="flex min-h-[11rem] items-center justify-center sm:min-h-[14rem]">
              {specimen.mark ? (
                <Image
                  src={specimen.mark.src}
                  alt={labels.markAlt}
                  width={specimen.mark.width}
                  height={specimen.mark.height}
                  className="h-auto w-full max-w-[24rem] object-contain"
                  sizes="(max-width: 1024px) 80vw, 384px"
                  priority
                />
              ) : (
                <p
                  style={{ fontFamily: fontStack(specimen.fonts.heading) }}
                  className="text-center text-[clamp(2.75rem,7vw,4.5rem)] font-semibold leading-none text-[var(--guest-ink)]"
                >
                  {specimen.name}
                </p>
              )}
            </div>

            <div>
              <p
                style={{ fontFamily: fontStack(specimen.fonts.body) }}
                className="max-w-[34ch] text-lg leading-relaxed text-[var(--guest-ink)]"
              >
                {specimen.line}
              </p>

              {/*
                A description list, because that is what this is: two labels and
                the families the run chose for them. The family name is printed
                whether or not the visitor has the font, which is the point of
                `fontStack` — the specimen is set in it when it is available and
                names itself either way.
              */}
              <dl className="mt-8 text-sm">
                <div className="flex items-baseline justify-between gap-6 border-t border-[var(--guest-line)] py-3">
                  <dt className="text-[var(--guest-ink-faint)]">{labels.headingFont}</dt>
                  <dd
                    style={{ fontFamily: fontStack(specimen.fonts.heading) }}
                    className="text-end text-[var(--guest-ink)]"
                  >
                    {specimen.fonts.heading}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-6 border-t border-[var(--guest-line)] py-3">
                  <dt className="text-[var(--guest-ink-faint)]">{labels.bodyFont}</dt>
                  <dd
                    style={{ fontFamily: fontStack(specimen.fonts.body) }}
                    className="text-end text-[var(--guest-ink)]"
                  >
                    {specimen.fonts.body}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/*
            The palette along the base of the plate.

            No text is ever placed on a swatch. A generated colour is model
            output and the only colours checked against this paper are the three
            ink tones; a hex label sitting on its own swatch would be the one
            unchecked pairing on the page, so the hex is printed underneath in
            an ink that was checked.
          */}
          <div className="px-8 pb-8 sm:px-12 sm:pb-12">
            <p className="text-sm text-[var(--guest-ink-faint)]">{labels.palette}</p>
            <div className="mt-4 flex gap-2 sm:gap-3">
              {specimen.swatches.map((hex) => (
                <div key={hex} className="min-w-0 flex-1">
                  <div
                    style={{ backgroundColor: hex }}
                    className="h-14 rounded-control ring-1 ring-[var(--guest-line)] sm:h-20"
                  />
                  {/*
                    A `<bdi dir="ltr">`, or the bidi algorithm moves the hash.

                    `#` is a neutral character and the six digits after it
                    resolve left-to-right, so inside an Arabic paragraph the
                    hash is pushed to the far end and the label reads
                    `D4A853#`. It happened to survive on `#1B3A3A`, which
                    starts with a digit, so the row printed three broken
                    labels beside one correct one.

                    `<bdi>` rather than `dir` on the paragraph: it isolates the
                    hex from the surrounding run without taking the paragraph
                    out of the page's direction, so the label still aligns to
                    the same edge of the swatch it belongs to.
                  */}
                  <p className="mt-2 truncate font-mono text-[0.65rem] uppercase text-[var(--guest-ink-faint)]">
                    <bdi dir="ltr">{hex}</bdi>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/*
        The wall label, outside the frame and in the page's own quiet ink. A
        gallery does not print its caption on the canvas, and PRODUCT.md is
        explicit that any example brand shown has to be labelled as generated
        output.
      */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
        <div role="group" aria-label={labels.swap} className="flex flex-wrap gap-2">
          {specimens.map((option, index) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setActive(index)}
              aria-pressed={index === active}
              className={cn(
                'flex items-center gap-2.5 rounded-full border px-4 py-2 text-sm transition-colors',
                index === active
                  ? 'border-line-strong text-fg'
                  : 'border-line text-fg-secondary hover:text-fg',
              )}
            >
              {/* The brand's primary, raw and unchecked — which is safe because
                  nothing is written on it. */}
              <span
                aria-hidden
                style={{ backgroundColor: option.palette.primary }}
                className="size-3 rounded-full ring-1 ring-line-strong"
              />
              {option.name}
            </button>
          ))}
        </div>

        <p className="text-sm text-fg-muted">{labels.wall}</p>
      </div>
    </div>
  )
}
