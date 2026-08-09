import { Check, FileText } from 'lucide-react'
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
} from '@/components/ui/horizon'
import { AfterHeadline, HeadlineWords } from '@/components/features/landing/motion-hero'
import { PricingFaq } from '@/components/features/landing/pricing-faq'
import { PricingPlans } from '@/components/features/landing/pricing-plans'
import { StartCta } from '@/components/features/landing/start-cta'
import { buttonVariants } from '@/components/ui/button'
import { LogoMark } from '@/components/ui/logo'
import { MomentumField, MomentumItem } from '@/components/ui/momentum'
import { Link } from '@/i18n/navigation'
import { getSession } from '@/server/session'

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
/**
 * Real files from a completed run, used as the deliverable specimens.
 *
 * Sultana — a Syrian kitchen — rather than the earlier coffee brand, because
 * it is the project that exercises everything the product now does: two
 * concepts at 1536, a true vector trace, transparent variants, an Arabic
 * wordmark that has to shape correctly, and a social kit. Nothing here is a
 * mockup; every file is what a customer downloads.
 */
/*
 * Rendered from the run's vector traces, not its raster previews. The previews
 * were downsampled generations — soft edges, mush in the lattice, and a paper
 * background baked in, which put a cream rectangle inside every white tile.
 * Traced, stripped of that paper and trimmed, each mark is transparent and
 * fills its tile, so every one of these carries its own ratio.
 */
const LOGOS = [
  { src: '/marketing/sultana-wordmark.webp', width: 1200, height: 464 },
  { src: '/marketing/sultana-icon.webp', width: 1200, height: 980 },
  { src: '/marketing/sultana-symbol.webp', width: 1200, height: 792 },
  { src: '/marketing/sultana-name.webp', width: 1200, height: 260 },
]

/**
 * The posts the kit produced for that same run, at the size the renderer wrote
 * them. They were 900px re-encodes of these 1080px files, which cost a
 * downscale and a second lossy pass to show the same picture.
 */
const POSTS = [
  '/marketing/sultana-post-hero.webp',
  '/marketing/sultana-post-feature.webp',
  '/marketing/sultana-post-detail.webp',
  '/marketing/sultana-post-palette.webp',
]

/** Sultana's own palette, as the run wrote it. */
const PALETTE = ['#1B3A3A', '#D4A853', '#F43F5E', '#FEFAF5']

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
  // Shared with StartCta's own lookup — getSession is cache()d per render.
  const session = await getSession()
  const rest = t.raw('restItems') as string[]
  const steps = t.raw('steps') as { name: string; body: string }[]

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
        <StartCta />
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
              <AfterHeadline delay={0.18}>
                <span className="type-trail block">{t('heroHeadlineAfter')}</span>
              </AfterHeadline>
            </h1>
          </div>

          <AfterHeadline delay={0.3}>
            <p className="mx-auto mt-7 max-w-[52ch] text-lg leading-relaxed text-fg-secondary">
              {t('heroDeck')}
            </p>
          </AfterHeadline>

          <AfterHeadline delay={0.4}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/pricing"
                className={buttonVariants({ variant: 'outline', shape: 'pill' })}
              >
                {t('ctaSecondary')}
              </Link>
              <StartCta />
            </div>
          </AfterHeadline>
        </div>

        {/* The product, framed in front of the light and cropped by the fold. */}
        <div className="relative z-10 mx-auto mt-28 max-w-6xl px-8 sm:mt-36">
          <ProductFrame>
            <div className="rounded-t-panel border border-line bg-elevated/30 p-2 shadow-[0_-10px_80px_-20px_color-mix(in_srgb,var(--brand-indigo)_60%,transparent)] backdrop-blur">
              {/*
                Renamed, not overwritten. The optimizer keys its cache on this
                path, so replacing the file behind the same name leaves every
                layer between here and a browser — the image cache, the CDN, the
                visitor's disk — serving the old picture. The greeting in it is
                the whole reason it changed, so it cannot be the one thing that
                does not arrive.
              */}
              <Image
                src="/marketing/app-overview.webp"
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
      <div aria-hidden className="rule-fade" />
      <section id="kit" className="relative overflow-hidden bg-surface/50">
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
              {/*
                No bloom on this one, deliberately. `bloom` clips to its own box
                so a radial cannot bleed past a rounded corner, and the four
                concepts in here can be picked up and thrown — a card flicked to
                the edge would be cut in half by the clip, on the one part of
                the page where a visitor can put a hand on real output.
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
                      <MomentumItem key={logo.src} throwGain={0.4} spinGain={0.09}>
                        <div className="h-full min-h-0 overflow-hidden rounded-control bg-white/95">
                          <Image
                            src={logo.src}
                            alt={t('kitLogoAlt')}
                            width={logo.width}
                            height={logo.height}
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
                {/*
                  The light inside the card, which the reference gives its bento
                  and this grid did not have: a source rising from the card's
                  own base rather than an even fill inside a lit ring.

                  Two of the six carry it — this one and the last — because the
                  reference lights two of its six, and a bento where every cell
                  glows is a bento where nothing is lit.
                */}
                <div className="lit-inner bloom flex flex-col justify-between p-7 [--bloom-strength:18%]">
                  <p className="text-sm text-fg-secondary">{t('kitNames')}</p>
                  <div>
                    <p className="text-2xl font-semibold tracking-[-0.02em]">Sultana</p>
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
                    <p className="text-3xl font-semibold tracking-[-0.02em]">Reem Kufi Ink</p>
                    <p className="text-sm text-fg-secondary">El Messiri</p>
                  </div>
                </div>
              </div>
            </Cell>

            <Cell index={4} className="col-span-2">
              <div className="lit h-full">
                <div className="lit-inner flex h-full flex-col p-7">
                  <p className="text-sm text-fg-secondary">{t('kitSocial')}</p>

                  {/* Four of the eight, at the size a grid of posts is read. */}
                  <div className="mt-5 grid flex-1 grid-cols-4 gap-2.5">
                    {POSTS.map((post) => (
                      <div key={post} className="overflow-hidden rounded-control bg-white/95">
                        <Image
                          src={post}
                          alt={t('kitSocialAlt')}
                          width={1080}
                          height={1080}
                          className="size-full object-cover"
                          sizes="130px"
                        />
                      </div>
                    ))}
                  </div>

                  {/*
                    The document itself, not a picture of it. It is the real
                    file the run produced, so the claim can be checked rather
                    than believed.
                  */}
                  <a
                    href="/marketing/sultana-brand-kit.pdf"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex w-fit items-center gap-2 rounded-control border border-line px-3 py-2 text-xs text-fg-secondary transition-colors hover:bg-elevated hover:text-white"
                  >
                    <FileText className="size-3.5" />
                    {t('kitPdf')}
                  </a>
                </div>
              </div>
            </Cell>

            <Cell index={5} className="col-span-2">
              <div className="lit h-full">
                <div className="lit-inner bloom flex flex-col justify-between p-7 [--bloom-x:84%] [--bloom-strength:18%]">
                  <p className="text-sm text-fg-secondary">{t('kitRest')}</p>
                  <PillFan items={rest} className="flex flex-wrap gap-2" />
                </div>
              </div>
            </Cell>
          </div>
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
            <StartCta size="lg" className="mt-10" />
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
            {!session && (
              <Link href="/login" className="text-fg-secondary transition-colors hover:text-white">
                {tn('signIn')}
              </Link>
            )}
          </nav>
        </div>
      </footer>
    </div>
  )
}
