import { ArrowRight, Check } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import Image from 'next/image'

import { HeroBadge } from '@/components/features/landing/float'
import { PaletteDeal, PillFan, StepMark } from '@/components/features/landing/flourish'
import {
  Cell,
  Horizon,
  LightSweep,
  SectionArc,
  ProductFrame,
  SectionReveal,
} from '@/components/features/landing/horizon'
import { AfterHeadline, HeadlineWords } from '@/components/features/landing/motion-hero'
import { PricingPlans } from '@/components/features/landing/pricing-plans'
import { buttonVariants } from '@/components/ui/button'
import { LogoMark } from '@/components/ui/logo'
import { MomentumField, MomentumItem } from '@/components/ui/momentum'
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
/** Real files from a completed run, used as the deliverable specimens. */
const LOGOS = [
  '/marketing/makan-wordmark.webp',
  '/marketing/makan-lettermark-monogram.webp',
  '/marketing/makan-mark.webp',
  '/marketing/makan-emblem-badge.webp',
]

const PALETTE = ['#6F4E37', '#D4A574', '#C08552', '#FAF6F0', '#2D1B0E']

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
  const rest = t.raw('restItems') as string[]
  const steps = t.raw('steps') as { name: string; body: string }[]

  return (
    <div className="world-dark min-h-dvh overflow-x-hidden">
      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-8 py-6">
        <span className="flex items-center gap-2.5">
          <LogoMark className="size-6" id="horizon" />
          <span className="font-semibold tracking-[-0.01em]">Brandora</span>
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
      <section className="relative overflow-hidden pb-0 pt-14 text-center sm:pt-20">
        <Horizon />

        <div className="relative z-10 mx-auto max-w-4xl px-8">
          <HeroBadge>
            <span className="inline-flex items-center gap-2.5 rounded-full border border-line bg-elevated/40 py-1 pe-4 ps-1 text-sm backdrop-blur">
              <span className="rounded-full bg-[image:var(--brand-gradient)] px-3 py-1 text-xs font-semibold">
                {t('badgePill')}
              </span>
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
            */}
            <h1 className="type-display">
              <HeadlineWords text={t('heroHeadline')} />{' '}
              <AfterHeadline delay={0.3}>
                <span className="type-trail block">{t('heroHeadlineAfter')}</span>
              </AfterHeadline>
            </h1>
          </div>

          <AfterHeadline delay={0.5}>
            <p className="mx-auto mt-7 max-w-[52ch] text-lg leading-relaxed text-fg-secondary">
              {t('heroDeck')}
            </p>
          </AfterHeadline>

          <AfterHeadline delay={0.62}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
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

        {/* The product, framed in front of the light and cropped by the fold. */}
        <div className="relative z-10 mx-auto mt-28 max-w-6xl px-8 sm:mt-36">
          <ProductFrame>
            <div className="rounded-t-panel border border-line bg-elevated/30 p-2 shadow-[0_-10px_80px_-20px_color-mix(in_srgb,var(--brand-indigo)_60%,transparent)] backdrop-blur">
              <Image
                src="/marketing/app-dashboard.webp"
                alt={t('productAlt')}
                width={1600}
                height={900}
                className="w-full rounded-t-card"
                sizes="(max-width: 1024px) 100vw, 1100px"
                priority
              />
            </div>
          </ProductFrame>
        </div>
      </section>

      {/* -------------------------------------------------------------- kit */}
      <section id="kit" className="relative overflow-hidden border-t border-line bg-surface/50">
        <SectionArc className="top-0" />
        <LightSweep />
        <div className="relative z-10 mx-auto max-w-7xl px-8 py-28">
          <SectionReveal>
            <h2 className="type-section max-w-2xl">
              {t('kitTitle')}
              <span className="type-trail"> {t('kitTitleAccent')}</span>
            </h2>
          </SectionReveal>

          {/*
            The deliverables are shown, not listed. Ten identical cells told the
            visitor a count; these tiles hand over the actual artifacts a run
            produced, sized by how much looking each one rewards.
          */}
          <div className="mt-16 grid auto-rows-[13rem] grid-cols-2 gap-4 lg:grid-cols-4">
            {/*
              The one place on the page a visitor can put a hand on the output,
              so it is the one place that answers back individually. The old
              behaviour scaled all four whenever the cell was hovered, which
              told you the cell was hoverable and nothing about the logos.
            */}
            {/*
              The row span is what the inner grid measures itself against. Set
              to one row's height while spanning two, the four concept tiles
              overflowed this card by 179px and the two at the bottom were
              covered by the tile beneath — so the one place a visitor can look
              at real output showed half of it.
            */}
            <Cell index={0} className="col-span-2 row-span-2 min-h-0" lift={false}>
              {/*
                `lit` and `lit-inner`, not a sixth hand-written copy of them.

                All six cells in this grid spelled the edge out inline and had
                drifted to three different accent strengths — 28%, 30% and 35% —
                for no reason anyone recorded. They were also lit from the top,
                which is the light this system no longer has.
              */}
              <div className="lit relative h-full">
                <div className="lit-inner flex min-h-0 flex-col p-7">
                  <p className="text-sm text-fg-secondary">{t('kitLogos')}</p>
                  {/*
                    Two explicit rows. The inner grid's rows were `auto`, so
                    each one took the natural height of a square image at half
                    the card's width — about 500px of content in 300px of card,
                    which is how two of the four concepts ended up underneath
                    the tile below.
                  */}
                  <MomentumField className="mt-5 grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-3">
                    {LOGOS.map((logo) => (
                      <MomentumItem key={logo} throwGain={0.4} spinGain={0.09}>
                        <div className="h-full min-h-0 overflow-hidden rounded-control bg-white/95">
                          <Image
                            src={logo}
                            alt={t('kitLogoAlt')}
                            width={720}
                            height={720}
                            className="size-full object-contain p-2"
                            sizes="160px"
                          />
                        </div>
                      </MomentumItem>
                    ))}
                  </MomentumField>
                  <p className="mt-4 text-xs text-fg-muted">{t('kitLogosNote')}</p>
                </div>
              </div>
            </Cell>

            <Cell index={1} className="col-span-2">
              <div className="lit h-full">
                <div className="lit-inner flex flex-col p-7">
                  <p className="text-sm text-fg-secondary">{t('kitPalette')}</p>
                  <PaletteDeal colors={PALETTE} className="mt-5 flex flex-1 gap-2" />
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-fg-muted">
                    {PALETTE.map((hex) => (
                      <span key={hex}>{hex}</span>
                    ))}
                  </div>
                </div>
              </div>
            </Cell>

            <Cell index={2}>
              <div className="lit h-full">
                <div className="lit-inner flex flex-col justify-between p-7">
                  <p className="text-sm text-fg-secondary">{t('kitNames')}</p>
                  <div>
                    <p className="text-2xl font-semibold tracking-[-0.02em]">Makān</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-fg-muted">
                      {t('kitNameReason')}
                    </p>
                  </div>
                </div>
              </div>
            </Cell>

            <Cell index={3}>
              <div className="lit h-full">
                <div className="lit-inner flex flex-col justify-between p-7">
                  <p className="text-sm text-fg-secondary">{t('kitType')}</p>
                  <div>
                    <p className="text-3xl font-semibold tracking-[-0.02em]">Sora</p>
                    <p className="text-sm text-fg-secondary">Inter · DM Serif Display</p>
                  </div>
                </div>
              </div>
            </Cell>

            <Cell index={4} className="col-span-2">
              <div className="lit group h-full overflow-hidden">
                <div className="lit-inner relative overflow-hidden">
                  <Image
                    src="/marketing/makan-website.webp"
                    alt={t('kitWebsiteAlt')}
                    width={1200}
                    height={806}
                    className="size-full object-cover object-top opacity-80 transition-transform duration-500 group-hover:scale-[1.03]"
                    sizes="(max-width: 1024px) 100vw, 560px"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-[image:linear-gradient(0deg,var(--bg-surface),transparent)] p-6 pt-16">
                    <p className="text-sm font-semibold">{t('kitWebsite')}</p>
                    <p className="text-xs text-fg-secondary">{t('kitWebsiteNote')}</p>
                  </div>
                </div>
              </div>
            </Cell>

            <Cell index={5} className="col-span-2">
              <div className="lit h-full">
                <div className="lit-inner flex flex-col justify-between p-7">
                  <p className="text-sm text-fg-secondary">{t('kitRest')}</p>
                  <PillFan items={rest} className="flex flex-wrap gap-2" />
                </div>
              </div>
            </Cell>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- how */}
      <section id="how" className="relative overflow-hidden border-t border-line">
        <SectionArc className="top-0" />
        <div className="relative z-10 mx-auto max-w-5xl px-8 py-28">
          <SectionReveal>
            <h2 className="type-section">{t('howTitle')}</h2>
          </SectionReveal>

          {/*
            A descent rather than five columns: the run happens in sequence, and
            a row of equal boxes said nothing about order. The rail carries the
            eye down it, and each stage states what it produces.
          */}
          {/*
            The rail sits outside the list now. An `<ol>` may contain only
            `<li>`, and this one held a decorative div plus a motion wrapper
            around every item — enough for several screen readers to drop the
            list semantics, so "How a run works" stopped announcing five steps.
          */}
          <div className="relative mt-16">
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
        </div>
      </section>

      {/* ---------------------------------------------------------- pricing */}
      <section id="pricing" className="relative overflow-hidden border-t border-line bg-surface/50">
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

      <section className="relative overflow-hidden border-t border-line">
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

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-8 py-10">
          <span className="flex items-center gap-2.5">
            <LogoMark className="size-5" id="horizon-foot" />
            <span className="text-sm font-semibold">Brandora</span>
          </span>
          <Link
            href="/register"
            className="text-sm text-fg-secondary transition-colors hover:text-white"
          >
            {t('ctaPrimary')}
          </Link>
        </div>
      </footer>
    </div>
  )
}
