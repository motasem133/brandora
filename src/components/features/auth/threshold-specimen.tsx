import { getTranslations } from 'next-intl/server'

import { LOGOS, PALETTE, POSTS } from '@/components/features/landing/sultana'
import { brandTheme } from '@/lib/brand-theme'
import { cn } from '@/lib/utils'
import type { BrandPalette } from '@/lib/brand-theme'

export type Specimen = {
  /** The brand's own name, as the customer chose or the run produced it. */
  name: string
  palette: BrandPalette
  /** An absolute or app-relative URL to the mark. */
  logo: string | null
  /** A generated post, when the subject has one. Only the example brand does. */
  post?: string
  /** Which of the two this is, in the machine voice. */
  label: string
}

/**
 * The half of the threshold that is not the form.
 *
 * The product's whole argument, made in one object rather than in a sentence
 * about one: a mark on the paper it was drawn for, the palette it came out of,
 * and the claim set in that brand's own ink. It is the system's strongest move —
 * *the colour belongs to the customer* — applied to the one screen that had none
 * of it, and it is why this panel is a guest scope rather than chrome. The
 * Guest Colour Boundary Rule asks a single question of a surface: does it show
 * something the product generated? This one does, so the work supplies the
 * colour and the room stays out of the way.
 *
 * It is deliberately one move and not four. The form beside it keeps every
 * chrome token it had, the ramp is absent here (a guest palette may never
 * shadow `--brand-primary`, or a customer's own colours would decide where our
 * focus ring goes), and nothing in this panel is interactive.
 *
 * **Whose brand it is depends on who is arriving.** A stranger sees the example
 * run, labelled as generated output because PRODUCT.md requires it. Someone
 * coming back sees the last brand they were looking at, which is theirs and is
 * labelled as theirs. The panel does not know the difference; the layout hands
 * it a subject and it draws what that subject has.
 */
export async function ThresholdSpecimen({ specimen }: { specimen: Specimen }) {
  const t = await getTranslations('Landing')
  const theme = brandTheme(specimen.palette)

  /* A brand with no generated post is showing one artefact, not two, so the
     sheet takes the width the pair would have had rather than sitting small in
     a field with nothing beside it. */
  const solo = !specimen.post

  const swatches = paletteOf(specimen)

  return (
    <aside
      style={theme.vars}
      className="world-light relative hidden min-h-dvh flex-col justify-center gap-11 overflow-hidden px-12 py-16 lg:flex xl:px-16"
    >
      {/*
        The claim, in the brand's ink rather than ours.

        Two sentences at one size, split by weight of colour instead of by a
        label above them: the first states the input, the second the output, and
        the shape of the product is the gap between them. Both strings are the
        landing page's own, so the promise made at the door is the same promise
        made on the page it came from, word for word.
      */}
      <h2 className="max-w-[16ch] text-balance font-display text-[clamp(2.2rem,1rem+2.6vw,3.6rem)] font-semibold leading-[1.08] tracking-[-0.02em] rtl:leading-[1.5] rtl:tracking-normal">
        <span className="block text-fg-secondary">{t('kitTitle')}</span>
        <span className="block">{t('kitTitleAccent')}</span>
      </h2>

      <div className="flex items-end gap-7">
        {specimen.post && (
          <figure
            className="animate-rise m-0 w-[15rem] shrink-0 overflow-hidden rounded-card shadow-[var(--shadow-lifted)] xl:w-[17rem]"
            style={{ '--rise-y': '20px', '--rise-delay': '0.06s' } as React.CSSProperties}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={specimen.post} alt="" className="block h-auto w-full" />
          </figure>
        )}

        {/*
          The mark on its own paper, because a mark judged on our ground is a
          mark judged in the wrong light. `mix-blend-multiply` only where the
          paper is pale — on a dark brand it would erase the artwork.
        */}
        <div
          className={cn(
            'animate-rise shrink-0 rounded-card bg-surface p-6 shadow-[var(--shadow-lifted)]',
            solo ? 'w-[24rem] p-8 xl:w-[27rem]' : 'w-[17rem] xl:w-[19rem]',
          )}
          style={{ '--rise-y': '20px', '--rise-delay': '0.16s' } as React.CSSProperties}
        >
          {specimen.logo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={specimen.logo}
              alt=""
              className={cn(
                'block w-full object-contain object-start',
                solo ? 'h-24' : 'h-16',
                !theme.isDark && 'mix-blend-multiply',
              )}
            />
          ) : (
            <p dir="auto" className={cn('truncate font-display font-semibold', solo ? 'text-4xl' : 'text-2xl')}>
              {specimen.name}
            </p>
          )}

          <div className="mt-6 flex gap-1.5">
            {swatches.map((hex, index) => (
              <span
                key={hex}
                style={
                  {
                    backgroundColor: hex,
                    '--rise-y': '0px',
                    '--rise-duration': '0.4s',
                    '--rise-delay': `${0.34 + index * 0.05}s`,
                  } as React.CSSProperties
                }
                /* The hairline is what keeps a brand's paper colour visible;
                   Sultana's `#FEFAF5` is otherwise a white bar on white. */
                className="animate-rise h-2.5 flex-1 rounded-full ring-1 ring-inset ring-line"
              />
            ))}
          </div>
        </div>
      </div>

      {/*
        The machine voice, for what the machine made — at the foot of the column
        rather than under the artefacts. Sitting in the stack it left the field
        bottom-empty and the three parts reading as one floating block; on the
        floor it gives the column a base, and the claim, the work and the
        provenance each get their own band of the screen.
      */}
      <p className="absolute bottom-10 start-12 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-fg-muted xl:start-16">
        {specimen.label}
      </p>
    </aside>
  )
}

/**
 * The same subject, on a screen that has one column.
 *
 * A phone got none of this: a white sheet on grey, with the product's own
 * argument and the customer's own colour both waiting behind a breakpoint. The
 * answer is not the desktop panel shrunk — a 1080px post and a 57px heading do
 * not survive 390px — it is the smallest true version of the same sentence: the
 * mark, the palette it came out of, and whose brand it is.
 *
 * It is a bounded band rather than the page's ground, and that is the Colour Arc
 * Rule doing its job. A guest scope may not own the form: the ramp is absent
 * inside it by design, so a sign-in button and its focus ring drawn in a
 * customer's palette would be drawn in colours nobody checked. The band is the
 * guest; everything below it stays chrome.
 *
 * The room for it was taken, not added. The centred lockup above the sheet was
 * 80px of Brandora on the screen where the *customer's* brand should be
 * speaking, and it moved to the header row where a mark on a sign-in page
 * belongs.
 */
export async function ThresholdBand({ specimen }: { specimen: Specimen }) {
  const theme = brandTheme(specimen.palette)
  const swatches = paletteOf(specimen)

  return (
    <div className="mb-5 w-full max-w-[26rem] lg:hidden">
      <div
        style={theme.vars}
        className="world-light flex items-center gap-4 rounded-card px-4 py-3.5 shadow-[var(--shadow-soft)]"
      >
        {specimen.logo ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={specimen.logo}
            alt=""
            className={cn('h-8 w-auto max-w-[9.5rem] shrink-0 object-contain', !theme.isDark && 'mix-blend-multiply')}
          />
        ) : (
          <p dir="auto" className="min-w-0 shrink truncate font-display text-base font-semibold">
            {specimen.name}
          </p>
        )}

        <div className="flex min-w-0 flex-1 justify-end gap-1">
          {swatches.map((hex) => (
            <span
              key={hex}
              style={{ backgroundColor: hex }}
              className="h-6 w-6 rounded-full ring-1 ring-inset ring-line"
            />
          ))}
        </div>
      </div>

      <p className="mt-2 px-1 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-fg-muted">
        {specimen.label}
      </p>
    </div>
  )
}

/** The brand's colours, in the order a run writes them, without the repeats. */
function paletteOf(specimen: Specimen) {
  return [
    specimen.palette?.primary,
    specimen.palette?.secondary,
    specimen.palette?.accent,
    specimen.palette?.text,
    specimen.palette?.background,
  ].filter((hex, index, all): hex is string => Boolean(hex) && all.indexOf(hex) === index)
}

/** The example run, for anyone the product has not met yet. */
export function exampleSpecimen(sampleNotice: string): Specimen {
  return {
    name: 'Sultana',
    palette: {
      primary: PALETTE[0],
      secondary: PALETTE[1],
      accent: PALETTE[2],
      background: PALETTE[3],
      text: PALETTE[0],
    },
    logo: LOGOS[0].src,
    post: POSTS[2],
    label: `${sampleNotice} · Sultana`,
  }
}
