import { ArrowRight, Check } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import Image from 'next/image'

import { HeroBadge } from '@/components/features/landing/float'
import { PillFan, StepMark } from '@/components/features/landing/flourish'
import { BrandDrawer } from '@/components/features/landing/brand-drawer'
import { BrandStage } from '@/components/features/landing/brand-stage'
import { SPECIMENS } from '@/components/features/landing/specimens'
import type { Specimen } from '@/components/features/landing/specimens'
import { Cell, SectionArc, ProductFrame, SectionReveal } from '@/components/ui/horizon'
import { AfterHeadline, HeadlineWords } from '@/components/features/landing/motion-hero'
import { PricingFaq } from '@/components/features/landing/pricing-faq'
import { PricingPlans } from '@/components/features/landing/pricing-plans'
import { buttonVariants } from '@/components/ui/button'
import { LogoMark } from '@/components/ui/logo'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

/**
 * Direction D — Horizon.
 *
 * Built to the reference the client supplied: near-black ground, a centred
 * column, and a light source rising behind the fold with the product framed in
 * front of it. The arc is the page's whole visual argument, so it is drawn
 * rather than illustrated — a gradient ring, bloomed, cropped by the section.
 *
 * The reference's customer logo wall is deliberately absent: there are no
 * customers yet, and inventing a "trusted by" row is the one thing on that
 * page we cannot honestly copy.
 */
export default async function HorizonDirection({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  /*
   * Every string on this page comes from the catalogue.
   *
   * The page previously called `setRequestLocale` and then hardcoded English,
   * so `/ar` rendered English inside an RTL frame — the bidi algorithm
   * reordering it into "brand entire Your ,identity" on the one surface that
   * has to prove the product generates Arabic natively.
   */
  const t = await getTranslations('Landing')
  const tn = await getTranslations('Nav')
  const rest = t.raw('restItems') as string[]
  const steps = t.raw('steps') as { name: string; body: string }[]

  /*
   * The two lines are treated differently because they are different things.
   *
   * Sultana's is ours — an editorial gloss on why the run picked that name — so
   * it goes through the catalogue and is written natively in Arabic. Makān's is
   * the slogan the run generated, so it is reproduced verbatim in both locales,
   * exactly as the brand's name and its font families are. Translating a piece
   * of generated output to display it would misrepresent the output.
   */
  const LINES: Record<string, string> = {
    sultana: t('kitNameReason'),
    makan: 'Brewed for focus.',
  }
  const specimens: Specimen[] = SPECIMENS.map((source) => ({
    ...source,
    line: LINES[source.id],
  }))

  const stageLabels = {
    swap: t('stageSwap'),
    wall: t('stageWall'),
    palette: t('kitPalette'),
    headingFont: t('headingFont'),
    bodyFont: t('bodyFont'),
    markAlt: t('kitLogoAlt'),
  }

  const drawerLabels = {
    logos: t('kitLogos'),
    logosNote: t('kitLogosNote'),
    logoAlt: t('kitLogoAlt'),
    posts: t('kitSocial'),
    postAlt: t('kitSocialAlt'),
    values: t('kitValues'),
    type: t('kitType'),
    headingFont: t('headingFont'),
    bodyFont: t('bodyFont'),
    pdf: t('kitPdf'),
  }

  return (
    <div className="world-dark min-h-dvh overflow-x-hidden">
      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-8 py-6">
        <span className="flex items-center gap-2.5">
          <LogoMark className="size-12" />
          <span className="text-lg font-semibold tracking-[-0.01em]">Brandora</span>
        </span>

        <nav className="hidden items-center gap-8 text-sm text-fg-secondary md:flex">
          <a href="#kit" className="transition-colors hover:text-white">
            {t('navKit')}
          </a>
          <a href="#how" className="transition-colors hover:text-white">
            {t('navHow')}
          </a>
          <a href="#pricing" className="transition-colors hover:text-white">
            {t('navPricing')}
          </a>
        </nav>

        {/*
          The same control the app uses, in the marketing world's shape.

          These CTAs were four hand-rolled copies of the primary button that had
          already drifted apart — three padding pairs, three shadow radii, none
          of them the component. `shape="pill"` is what the reference does with
          every control and what this page was reaching for by hand.
        */}
        <Link href="/register" className={buttonVariants({ shape: 'pill' })}>
          {t('ctaPrimary')}
          <ArrowRight className="size-4 rtl:rotate-180" />
        </Link>
      </header>

      {/* The header's rule stops before the edges. A line running corner to
          corner is the clearest signal a page is a template. */}
      <div aria-hidden className="rule-fade relative z-20" />

      {/*
        Without JavaScript, 49 elements below the fold stayed at `opacity: 0`
        for good — about four thousand pixels of blank ground on a phone,
        because the reveal never fired. The reveal is an enhancement; the
        content is not conditional on it.
      */}
      <noscript>
        <style
          dangerouslySetInnerHTML={{
            __html:
              '[data-reveal]{opacity:1!important;transform:none!important;filter:none!important}',
          }}
        />
      </noscript>

      <main id="content" tabIndex={-1}>
      {/* ------------------------------------------------------------- hero */}
      {/*
        The fold's light used to be the `<Horizon>` arc: a violet crest behind
        the copy, throwing a 46rem bloom up into it. It is a good drawing and it
        was the problem. Every colour in the first viewport came from Brandora,
        which is the composition of every AI product's landing page, and it left
        the customer's brand as five chips a scroll further down. The arc is
        gone from this section and stays in the four below it, where there is no
        generated brand to compete with.
      */}
      {/*
        Two columns from `lg`, and the narrow one is ours.

        Stacked and centred, the copy alone filled a laptop viewport — badge,
        three lines of display type, a deck and two controls came to about 500px
        — and the plate below it crested the fold by a hundred pixels. That is
        the old composition with a new picture in it. Side by side, the brand
        holds roughly two thirds of the frame and is whole above the fold, which
        is the only arrangement that makes the argument the section is for.
      */}
      <section className="relative overflow-hidden pb-0 pt-14 sm:pt-20">
        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-x-14 gap-y-12 px-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="text-center lg:text-start">
          <HeroBadge>
            {/*
              The pill's gradient fill went with the arc. There are two spends
              of the brand ramp in this viewport now — the mark in the header and
              the primary control — and a badge is not worth one of them.
            */}
            <span className="inline-flex items-center gap-2.5 rounded-full border border-line bg-elevated/40 px-4 py-1.5 text-sm backdrop-blur">
              <span className="font-semibold">{t('badgePill')}</span>
              <span aria-hidden className="h-3.5 w-px bg-line-strong" />
              <span className="text-fg-secondary">{t('badgeText')}</span>
            </span>
          </HeroBadge>

          <div className="mt-8">
            {/*
              One sentence, one heading. The second clause was a `<p>` at
              identical display size, which left the page's accessible title as
              the fragment "Your entire brand identity,".

              Word-level split, which is what keeps this legible in Arabic:
              characters join, so a per-letter animation would break the script
              outright.

              Size, weight, leading and both Arabic overrides now live in
              `type-display`. They were spelled out here and in four other
              headings on this page, which is how one of them ended up a step
              off from the rest.

              The section step rather than the display one, which is the whole
              point: the largest thing in this viewport is the customer's mark,
              not our sentence about it. The page's own voice takes the display
              size once, at the close, where there is no brand to speak over.
            */}
            <h1 className="type-section">
              <HeadlineWords text={t('heroHeadline')} />{' '}
              <AfterHeadline delay={0.3}>
                <span className="type-trail block">{t('heroHeadlineAfter')}</span>
              </AfterHeadline>
            </h1>
          </div>

          <AfterHeadline delay={0.5}>
            <p className="mt-6 max-w-[44ch] leading-relaxed text-fg-secondary max-lg:mx-auto">
              {t('heroDeck')}
            </p>
          </AfterHeadline>

          <AfterHeadline delay={0.62}>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Link
                href="/pricing"
                className={buttonVariants({ variant: 'outline', shape: 'pill' })}
              >
                {t('ctaSecondary')}
              </Link>
              <Link href="/register" className={buttonVariants({ shape: 'pill' })}>
                {t('ctaPrimary')}
                <ArrowRight className="size-4 rtl:rotate-180" />
              </Link>
            </div>
          </AfterHeadline>
        </div>

        {/*
          The output, not a picture of the tool that made it.

          What stood here was a screenshot of the dashboard in a lit frame,
          which is the same sentence as the headline said in a second medium:
          "this is a product that generates brands". The plate says something
          the copy cannot, because it is a brand, wearing itself, in the
          majority of the frame — and pressing the other chip repaints it
          through the same code path the app uses behind the login.
        */}
        <ProductFrame>
          <BrandStage specimens={specimens} labels={stageLabels} />
        </ProductFrame>
        </div>
      </section>

      {/* -------------------------------------------------------------- kit */}
      <div aria-hidden className="rule-fade" />
      {/*
        No `<SectionArc>` here, unlike every other section below the fold.

        The arc is Brandora's violet drawn across the top of a section, which is
        right where the section holds our argument and wrong where it holds a
        customer's work. It was crossing a cream drawer and tinting the top of
        Sultana's own paper, which is the same mistake the bento made with a
        lit edge, in a larger size.
      */}
      <section id="kit" className="relative overflow-hidden bg-surface/50">
        <div className="relative z-10 mx-auto max-w-6xl px-8 py-28">
          <SectionReveal>
            <h2 className="type-section max-w-2xl">
              {t('kitTitle')}
              <span className="type-trail"> {t('kitTitleAccent')}</span>
            </h2>
          </SectionReveal>

          {/*
            A cabinet of runs, not a grid of deliverables.

            The bento that stood here showed six cells of unequal size, every
            one of them Brandora's dark surface with a violet lit edge, holding
            a customer's logo, a customer's palette and a customer's posts. The
            section claims a run produces one coherent brand and then rendered
            that brand as six fragments of our chrome.

            Each drawer is a whole run instead, wearing its own paper, and the
            open one shows what that run left behind. It is also the shape the
            product actually has: `PRODUCT.md` says the account accumulates
            brands rather than settling on one, so a cabinet a visitor could
            keep pulling from is the honest picture of it.
          */}
          <div className="mt-16 grid gap-4">
            {specimens.map((specimen, index) => (
              <SectionReveal key={specimen.id} delay={Math.min(index * 0.08, 0.3)}>
                <BrandDrawer specimen={specimen} open={index === 0} labels={drawerLabels} />
              </SectionReveal>
            ))}
          </div>

          {/*
            What every run produces regardless of which drawer is open. It is
            our list rather than a brand's, so it stays out on the neutral
            ground rather than being painted into one of them.
          */}
          <SectionReveal className="mt-14">
            <p className="text-sm text-fg-muted">{t('kitRest')}</p>
            <PillFan items={rest} className="mt-4 flex flex-wrap gap-2" />
          </SectionReveal>
        </div>
      </section>

      {/* -------------------------------------------------------------- how */}
      <div aria-hidden className="rule-fade" />
      <section id="how" className="relative overflow-hidden">
        <SectionArc className="top-0" />
        <div className="relative z-10 mx-auto max-w-7xl px-8 py-28">
          <SectionReveal>
            <h2 className="type-section">{t('howTitle')}</h2>
          </SectionReveal>

          {/*
            Two columns, because one was stranding this section.

            The descent is unchanged and still right — the run happens in
            sequence, and a row of equal boxes said nothing about order. But a
            58ch column of text inside a 1024px section left the right-hand
            third of the widest part of this page empty, and the fix for empty
            space on a page selling generated output is not wider margins: it is
            the output. So the space now holds the product doing the thing the
            list is describing.
          */}
          {/*
            The rail sits outside the list. An `<ol>` may contain only `<li>`,
            and this one held a decorative div plus a motion wrapper around
            every item — enough for several screen readers to drop the list
            semantics, so "How a run works" stopped announcing five steps.
          */}
          <div className="mt-16 grid gap-x-16 gap-y-16 lg:grid-cols-[minmax(0,24rem)_1fr] lg:items-start">
          <div className="relative">
            {/* `rail` is the utility for exactly this and had no adopters,
                while its hand-written equivalent lived here. */}
            <div aria-hidden className="rail absolute bottom-8 start-[1.55rem] top-4 w-px" />

            <ol>
              {steps.map((step, index) => (
                <li key={step.name} className="pb-14 last:pb-0">
                  {/* The reveal wraps a real box: under `display: contents` it
                      would generate none, and animate nothing. */}
                  <Cell
                    index={index}
                    className="relative grid grid-cols-[3.5rem_1fr] items-start gap-x-6"
                  >
                  <StepMark
                    index={index}
                    className="rail-node relative z-10 flex size-14 items-center justify-center rounded-card text-lg font-semibold"
                  >
                    {index + 1}
                  </StepMark>

                    <div className="pt-2.5">
                      <p className="text-2xl font-semibold tracking-[-0.02em]">{step.name}</p>
                      <p className="mt-2 max-w-[58ch] leading-relaxed text-fg-secondary">
                        {step.body}
                      </p>
                    </div>
                  </Cell>
                </li>
              ))}
            </ol>
          </div>

          {/*
            The run itself, cropped out of the product and floated in the
            section's own light — which is what the reference does with every
            fragment of its app it puts on that page.

            Sticky, so it stays beside whichever step is being read rather than
            scrolling past the first one. Only from `lg`, where there are two
            columns for it to stay beside.
          */}
          <SectionReveal delay={0.15} className="lg:sticky lg:top-24">
            <div className="lit [--lit-radius:var(--radius-panel)]">
              <div className="lit-inner bloom p-4 [--bloom-strength:16%] sm:p-6">
                <Image
                  src="/marketing/run-brief.webp"
                  alt={t('howShot')}
                  /* The capture's own pixel dimensions. `w-full` with no height
                     class takes its aspect from these, so a stale pair here
                     stretches the screenshot rather than failing loudly. */
                  width={1440}
                  height={624}
                  className="w-full rounded-card"
                  sizes="(max-width: 1024px) 100vw, 640px"
                />
              </div>
            </div>
            <p className="mt-4 max-w-[46ch] text-sm text-fg-muted">{t('howShot')}</p>
          </SectionReveal>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- pricing */}
      <div aria-hidden className="rule-fade" />
      <section id="pricing" className="relative overflow-hidden bg-surface/50">
        <SectionArc className="top-0" />

        <div className="relative z-10 mx-auto max-w-7xl px-8 py-28">
          <SectionReveal>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <h2 className="type-section">{t('pricingHeading')}</h2>
              <p className="max-w-[42ch] text-fg-secondary">{t('pricingDeck')}</p>
            </div>
          </SectionReveal>

          {/*
            The same component the pricing page renders, from the same table
            that bills for it. These were two hand-written ladders that could —
            and did — disagree about what a plan includes.
          */}
          <div className="mt-16">
            <PricingPlans locale={locale} />
          </div>

          {/*
            The questions are part of the pricing section, not a page you have
            to go and find. Someone deciding on this page is the person with
            the questions, and sending them elsewhere to read the answers is
            where the decision gets postponed.
          */}
          <SectionReveal>
            <PricingFaq className="mt-16" />
          </SectionReveal>

          <p className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-fg-muted">
            <span className="flex items-center gap-2">
              <Check className="size-4 accent-text" />
              {t('assuranceCard')}
            </span>
            <span className="flex items-center gap-2">
              <Check className="size-4 accent-text" />
              {t('assuranceCredits')}
            </span>
            <span className="flex items-center gap-2">
              <Check className="size-4 accent-text" />
              {t('assuranceCancel')}
            </span>
          </p>
        </div>
      </section>

      <div aria-hidden className="rule-fade" />
      <section className="relative overflow-hidden">
        <SectionArc className="top-[38%]" />
        <div className="relative z-10 mx-auto max-w-7xl px-8 py-28 text-center">
          <SectionReveal>
            {/* The page's closing heading was a fifth size — 2.2rem to 4rem
                against the hero's 2.6 to 4.6 — for no reason anyone recorded.
                It takes the display step, like the hero. */}
            <h2 className="type-display mx-auto max-w-3xl">
              {t('closeTitle')}
              <span className="type-trail"> {t('closeTitleAccent')}</span>
            </h2>
          </SectionReveal>
          <SectionReveal delay={0.1}>
            <Link
              href="/register"
              className={cn(buttonVariants({ size: 'lg', shape: 'pill' }), 'mt-10')}
            >
              {t('ctaPrimary')}
              <ArrowRight className="size-4 rtl:rotate-180" />
            </Link>
          </SectionReveal>
        </div>
      </section>

      </main>

      {/*
        The foot of the page carries the page's own sections and the two
        destinations that exist off it. It used to be the mark and a single
        link, which is the one part of a long page a visitor reaches having
        decided not to press anything yet — and it offered them the same press
        they had already declined four times.
      */}
      <div aria-hidden className="rule-fade" />
      <footer>
        <div className="mx-auto flex max-w-7xl flex-wrap items-start justify-between gap-x-16 gap-y-8 px-8 py-12">
          <div>
            <span className="flex items-center gap-2.5">
              <LogoMark className="size-11" />
              <span className="text-sm font-semibold">Brandora</span>
            </span>
            <p className="mt-3 max-w-[34ch] text-sm text-fg-muted">{t('heroDeck')}</p>
            {/* The studio behind it, said once, quietly, at the bottom. */}
            <p className="mt-4 text-xs text-fg-muted">
              {t('poweredBy')}{' '}
              <a
                href="https://enigmitic.com"
                target="_blank"
                rel="noreferrer"
                className="text-fg-secondary transition-colors hover:text-white"
              >
                Enigmitic
              </a>
            </p>
          </div>

          <nav aria-label={t('navKit')} className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <a href="#kit" className="text-fg-secondary transition-colors hover:text-white">
              {t('navKit')}
            </a>
            <a href="#how" className="text-fg-secondary transition-colors hover:text-white">
              {t('navHow')}
            </a>
            <Link
              href="/pricing"
              className="text-fg-secondary transition-colors hover:text-white"
            >
              {t('navPricing')}
            </Link>
            <Link href="/login" className="text-fg-secondary transition-colors hover:text-white">
              {tn('signIn')}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
