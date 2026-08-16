import { Check } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import Image from 'next/image'

import { ArabicProof } from '@/components/features/landing/arabic-proof'
import { ContactSheet } from '@/components/features/landing/contact-sheet'
import { StepMark } from '@/components/features/landing/flourish'
import { HowPanel } from '@/components/features/landing/how-panel'
import { PricingFaq } from '@/components/features/landing/pricing-faq'
import { PricingPlans } from '@/components/features/landing/pricing-plans'
import { RunPanel } from '@/components/features/landing/run-panel'
import { RunSpine } from '@/components/features/landing/run-spine'
import { StartCta } from '@/components/features/landing/start-cta'
import { SULTANA } from '@/components/features/landing/sultana'
import { AfterHeadline, HeadlineWords } from '@/components/features/landing/motion-hero'
import { buttonVariants } from '@/components/ui/button'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Cell, Horizon, SectionArc, SectionReveal } from '@/components/ui/horizon'
import { LogoMark } from '@/components/ui/logo'
import { Link } from '@/i18n/navigation'
import { getSession } from '@/server/session'

/**
 * Direction E — The Run.
 *
 * The page is the run. It opens in an empty dark room, a real generation plays
 * in the fold, the room then hands itself over to the brand that generation
 * produced, and it closes back in the dark with the price.
 *
 * That arc is the argument, not a mood. A product selling brand coherence has
 * to demonstrate two things — that a whole identity arrives at once, and that
 * the pieces agree — and both are visual. The hero shows the arrival; the light
 * section shows the agreement, by being Sultana's paper rather than ours. The
 * Guest Palette Rule was already in the design system and this page had never
 * spent it.
 *
 * What the previous direction got wrong, and this is answering:
 *
 * - Its above-the-fold proof was a screenshot of the dashboard. The first image
 *   a visitor got from a brand generator was an admin UI, and the actual output
 *   started two thousand pixels down.
 * - Its five sections had one rhythm — rule, arc, heading, reveal, grid, at
 *   `py-28` each — so nothing accumulated and nothing pulled the scroll.
 * - A published website, which is one of the ten things a run makes, was a pill
 *   in a list called "And the rest of it".
 * - Arabic, the sharpest differentiator the product has, was not on the page.
 *   Nor were the three copy pairs written for it, which sat unreferenced in both
 *   catalogues: `coherence*`, `edit*`, `arabic*`.
 *
 * The reference's customer logo wall is still deliberately absent: there are no
 * customers yet, and inventing a "trusted by" row is the one thing on that page
 * we cannot honestly copy.
 */
export default async function RunDirection({
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
  const tp = await getTranslations('Pricing')
  // Shared with StartCta's own lookup — getSession is cache()d per render.
  const session = await getSession()
  const steps = t.raw('steps') as { name: string; body: string }[]
  const runSteps = t.raw('runSteps') as { key: string; label: string; detail: string }[]
  /* One caption per step for the panel beside the list, and the two real data
     sets its diagrams name. Both are already on the page elsewhere; reading them
     from the catalogue here rather than restating them is what keeps the process
     section from drifting away from the contact sheet. */
  const howCaptions = t.raw('howCaptions') as string[]
  const logoNames = t.raw('kitLogoNames') as string[]
  const sitePages = t.raw('kitWebsitePages') as string[]
  const runSections = runSteps.map(({ key, label }) => ({ key, label }))

  /*
   * Both languages, because the Arabic panel shows them side by side.
   *
   * `getTranslations` takes a locale, so the two briefs come out of the same
   * catalogues every other string does rather than being inlined here — which
   * is what stops the Arabic one from quietly becoming a translation of the
   * English one the next time somebody edits it.
   */
  const [ten, tar] = await Promise.all([
    getTranslations({ locale: 'en', namespace: 'Landing' }),
    getTranslations({ locale: 'ar', namespace: 'Landing' }),
  ])

  const briefOf = (m: typeof ten) => ({
    labelBusiness: m('runBriefLabelBusiness'),
    labelMarket: m('runBriefLabelMarket'),
    labelStyle: m('runBriefLabelStyle'),
    business: m('runBriefBusiness'),
    market: m('runBriefMarket'),
    style: m('runBriefStyle'),
  })

  const spine = [
    { id: 'kit', label: t('navKit') },
    { id: 'how', label: t('navHow') },
    { id: 'pricing', label: t('navPricing') },
    { id: 'faq', label: tp('faqTitle') },
  ]

  return (
    <div className="world-dark min-h-dvh overflow-x-hidden">
      {/*
        Sticky, which it was not.

        A page this long put its only header call to action above the first
        screen and then never offered it again until the visitor had scrolled
        past everything. The bar costs 72px and carries the one press this page
        is asking for.
      */}
      <header className="glass sticky top-0 z-40 border-b border-line">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <span className="flex items-center gap-2.5">
            <LogoMark className="size-10" />
            <span className="font-display text-lg font-semibold tracking-[-0.01em]">Brandora</span>
          </span>

          {/* `min-h-11` on each item: as bare inline links these measured 20px
              tall, which is under WCAG 2.2's 24px floor on the pointer devices
              that are the only ones ever to see this row. The bar's own height
              already allowed for it, so nothing moves. */}
          <nav className="hidden items-center gap-8 text-sm text-fg-secondary md:flex">
            {[
              { href: '#kit', label: t('navKit') },
              { href: '#how', label: t('navHow') },
              { href: '#pricing', label: t('navPricing') },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="inline-flex min-h-11 items-center transition-colors hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* 44px on touch, back to the compact 36px from `sm` up. This is the
              one control that follows the visitor down the whole page, so it is
              the last one that should be under the target-size floor. */}
          <StartCta size="sm" className="h-11 sm:h-9" />
        </div>
      </header>

      <RunSpine items={spine} label={t('spineAria')} />

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
        {/* ----------------------------------------------------------- hero */}
        <section className="relative overflow-hidden pb-24 pt-14 sm:pt-20">
          <Horizon />

          <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
              {/* The claim. Start-aligned rather than centred: a centred column
                  above a centred blob is the one hero shape this page was asked
                  not to be, and an asymmetric split is what lets the run sit
                  beside the sentence it is proving. */}
              <div className="lg:col-span-5">
                <span className="animate-fade-in inline-flex items-center gap-2.5 rounded-full border border-line bg-elevated/40 py-1 pe-4 ps-1 text-sm sm:backdrop-blur">
                  <span className="rounded-full bg-[image:var(--brand-gradient)] px-3 py-1 text-xs font-semibold">
                    {t('badgePill')}
                  </span>
                  <span className="text-fg-secondary">{t('badgeText')}</span>
                </span>

                {/*
                  One sentence, one heading. The second clause was a `<p>` at
                  identical display size, which left the page's accessible title
                  as the fragment "Your entire brand identity,".

                  Word-level split, which is what keeps this legible in Arabic:
                  characters join, so a per-letter animation would break the
                  script outright.
                */}
                {/* Tighter above the crease on a phone and unchanged from `sm`
                    up. The panel below still cannot fit in a 390×844 fold — it
                    is 616px tall — but every pixel taken out here is another
                    pixel of it visible, which is what invites the scroll that
                    starts the replay. */}
                <h1 className="type-display mt-6 sm:mt-7">
                  <HeadlineWords text={t('heroHeadline')} />{' '}
                  <AfterHeadline delay={0.18}>
                    <span className="type-trail block">{t('heroHeadlineAfter')}</span>
                  </AfterHeadline>
                </h1>

                <AfterHeadline delay={0.3}>
                  <p className="mt-5 max-w-[44ch] leading-relaxed text-fg-secondary sm:mt-6 sm:text-lg">
                    {t('heroDeck')}
                  </p>
                </AfterHeadline>

                <AfterHeadline delay={0.4}>
                  <div className="mt-7 flex flex-wrap items-center gap-3 sm:mt-9">
                    <StartCta size="lg" />
                    <Link
                      href="/pricing"
                      className={buttonVariants({
                        variant: 'outline',
                        size: 'lg',
                        shape: 'pill',
                      })}
                    >
                      {t('ctaSecondary')}
                    </Link>
                  </div>
                </AfterHeadline>
              </div>

              {/* The proof. */}
              <AfterHeadline delay={0.5} className="lg:col-span-7">
                <RunPanel
                  steps={runSteps}
                  strings={{
                    replay: t('runReplay'),
                    replayAction: t('runReplayAction'),
                    files: t('runFiles'),
                    briefBusiness: t('runBriefBusiness'),
                    briefMarket: t('runBriefMarket'),
                    briefStyle: t('runBriefStyle'),
                    labelBusiness: t('runBriefLabelBusiness'),
                    labelMarket: t('runBriefLabelMarket'),
                    labelStyle: t('runBriefLabelStyle'),
                    done: t('runDone'),
                    /*
                     * `raw`, because the placeholders are filled on the client.
                     *
                     * next-intl formats ICU at call time and throws when a
                     * `{step}` it can see has no value — and the values here
                     * depend on how far a replay running in the browser has
                     * got, which the server cannot know. The template crosses
                     * the boundary unformatted and the panel fills it in.
                     */
                    status: t.raw('runStatus') as string,
                    statusDone: t('runStatusDone'),
                    header: t('runHeader'),
                    logoNames,
                    socialAlt: t('kitSocialAlt'),
                  }}
                />
              </AfterHeadline>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------- what you get --- */}
        {/*
          The handover.

          `world-light` re-points every chrome token at the `--guest-*` variables
          `brandTheme` emits, so this whole region is Sultana's paper, ink and
          accent — contrast-checked against each other before they were written,
          not eyeballed. Brandora's ramp withdraws to the shell, which is what
          the Guest Palette Rule has always said and what the page never did.
        */}
        <section id="kit" className="world-light py-24 sm:py-32" style={SULTANA.vars}>
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <SectionReveal>
              <Eyebrow>{t('navKit')}</Eyebrow>
              <h2 className="type-section mt-4 max-w-3xl">
                {t('kitTitle')}
                <span className="type-trail"> {t('kitTitleAccent')}</span>
              </h2>
            </SectionReveal>

            <ContactSheet />

            {/*
              The conclusion the sheet has just demonstrated, said once.

              This copy existed in both catalogues and was rendered nowhere. It
              belongs here rather than in a section of its own: the argument
              "they match because they were decided together" is only worth
              making immediately after someone has looked at the things that
              match.
            */}
            <SectionReveal>
              <div className="mt-20 grid gap-8 border-t border-line pt-14 lg:grid-cols-12">
                <h3 className="type-section lg:col-span-5">{t('coherenceTitle')}</h3>
                <p className="max-w-[46ch] text-lg leading-relaxed text-fg-secondary lg:col-span-7">
                  {t('coherenceBody')}
                </p>
              </div>
            </SectionReveal>
          </div>
        </section>

        {/* ------------------------------------------------- how it works --- */}
        <section id="how" className="relative overflow-hidden py-24 sm:py-32">
          <SectionArc className="top-0" />

          <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
            <SectionReveal>
              <Eyebrow>{t('navHow')}</Eyebrow>
              <h2 className="type-section mt-4">{t('howTitle')}</h2>
            </SectionReveal>

            {/*
              The descent is unchanged and still right — the run happens in
              sequence, and a row of equal boxes said nothing about order. These
              numbers are the only ones on the page and they are a real
              sequence, which is the whole difference between this and a
              decorative 01/02/03.

              The rail sits outside the list. An `<ol>` may contain only `<li>`,
              and this one held a decorative div plus a motion wrapper around
              every item — enough for several screen readers to drop the list
              semantics, so "How a run works" stopped announcing five steps.
            */}
            <div className="mt-14 grid gap-x-16 gap-y-14 lg:grid-cols-[minmax(0,26rem)_1fr] lg:items-start">
              <div className="relative">
                <div aria-hidden className="rail absolute bottom-8 start-[1.55rem] top-4 w-px" />

                <ol>
                  {steps.map((step, index) => (
                    /* The id is what the panel beside this list observes to know
                       which step is being read. */
                    <li key={step.name} id={`how-step-${index}`} className="pb-12 last:pb-0">
                      {/* The reveal wraps a real box: under `display: contents`
                          it would generate none, and animate nothing. */}
                      <Cell
                        index={index}
                        className="relative grid grid-cols-[3.5rem_1fr] items-start gap-x-6"
                      >
                        <StepMark
                          index={index}
                          className="rail-node relative z-10 flex size-14 items-center justify-center rounded-card font-display text-lg font-semibold"
                        >
                          {index + 1}
                        </StepMark>

                        <div className="pt-2.5">
                          <p className="font-display text-2xl font-semibold tracking-[-0.02em]">
                            {step.name}
                          </p>
                          <p className="mt-2 max-w-[46ch] leading-relaxed text-fg-secondary">
                            {step.body}
                          </p>
                        </div>
                      </Cell>
                    </li>
                  ))}
                </ol>
              </div>

              {/*
                The run itself, cropped out of the product. Sticky, so it stays
                beside whichever step is being read rather than scrolling past
                the first one — and only from `lg`, where there are two columns
                for it to stay beside.

                It now changes with the step. One screenshot captioned "The first
                of eight questions" sat here beside all five, which meant the
                picture contradicted the words for four of them and left three
                hundred pixels of empty column beside the last two.
              */}
              <SectionReveal delay={0.15}>
                <HowPanel
                  stepIds={steps.map((_, index) => `how-step-${index}`)}
                  captions={howCaptions}
                  shotAlt={t('howShotAlt')}
                  logoNames={logoNames}
                  sections={runSections}
                  pages={sitePages}
                  refineNote={t('howRefineNote')}
                />
              </SectionReveal>
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------- refine --- */}
        {/* Recovered copy. "Then you change your mind" is the objection every
            visitor has at this point in the page, and the answer to it was
            written and then never rendered. */}
        <div aria-hidden className="rule-fade" />
        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-12">
              <SectionReveal className="lg:col-span-5">
                <h2 className="type-section">{t('editTitle')}</h2>
                <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-fg-secondary">
                  {t('editBody')}
                </p>
              </SectionReveal>

              <SectionReveal delay={0.12} className="lg:col-span-7">
                <div className="lit [--lit-radius:var(--radius-panel)]">
                  <div className="lit-inner p-2">
                    <Image
                      src="/marketing/app-overview.webp"
                      alt={t('productAlt')}
                      width={1600}
                      height={900}
                      className="w-full rounded-card"
                      sizes="(max-width: 1024px) 100vw, 720px"
                    />
                  </div>
                </div>
              </SectionReveal>
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------- arabic --- */}
        <div aria-hidden className="rule-fade" />
        <section className="relative overflow-hidden py-24 sm:py-32">
          <SectionArc className="top-0" />

          <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-12">
              <SectionReveal className="lg:col-span-5">
                <h2 className="type-section">{t('arabicTitle')}</h2>
                <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-fg-secondary">
                  {t('arabicBody')}
                </p>
              </SectionReveal>

              <SectionReveal delay={0.12} className="lg:col-span-7">
                <ArabicProof
                  en={briefOf(ten)}
                  ar={briefOf(tar)}
                  toggleAria={t('arabicToggleAria')}
                />
              </SectionReveal>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------- pricing --- */}
        <div aria-hidden className="rule-fade" />
        <section id="pricing" className="relative overflow-hidden bg-surface/50 py-24 sm:py-32">
          <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
            <SectionReveal>
              <Eyebrow>{t('navPricing')}</Eyebrow>
              <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
                <h2 className="type-section max-w-2xl">{t('pricingHeading')}</h2>
                <p className="max-w-[42ch] leading-relaxed text-fg-secondary">{t('pricingDeck')}</p>
              </div>
            </SectionReveal>

            {/*
              The same component the pricing page renders, from the same table
              that bills for it. These were two hand-written ladders that could
              — and did — disagree about what a plan includes.
            */}
            <div className="mt-14">
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

        {/* -------------------------------------------------------- faq --- */}
        {/*
          Its own section with its own id, so the rail can reach it. The
          questions stay on this page rather than behind a link: someone
          deciding here is the person with the questions, and sending them
          elsewhere to read the answers is where the decision gets postponed.
        */}
        <div aria-hidden className="rule-fade" />
        <section id="faq" className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <SectionReveal>
              <PricingFaq columns />
            </SectionReveal>
          </div>
        </section>

        {/* ------------------------------------------------------ close --- */}
        <div aria-hidden className="rule-fade" />
        <section className="relative overflow-hidden">
          <SectionArc className="top-[38%]" />
          <div className="relative z-10 mx-auto max-w-7xl px-6 py-28 text-center lg:px-8">
            <SectionReveal>
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
        {/* Extra bottom room below `lg` so the fixed section bar, which is
            showing by the time anyone reaches the footer, does not sit on top
            of the last row of links. */}
        <div className="mx-auto flex max-w-7xl flex-wrap items-start justify-between gap-x-16 gap-y-8 px-6 pb-28 pt-12 lg:px-8 lg:pb-12">
          <div>
            <span className="flex items-center gap-2.5">
              <LogoMark className="size-11" />
              <span className="text-sm font-semibold">Brandora</span>
            </span>
            {/* Was the hero's deck, repeated verbatim. The foot of a page is
                where a visitor who has read everything arrives; restating the
                first sentence they read tells them the page has run out. */}
            <p className="mt-3 max-w-[34ch] text-sm leading-relaxed text-fg-muted">{t('badgeText')}</p>
            {/* The studio behind it, said once, quietly, at the bottom. */}
            <p className="mt-4 text-xs leading-relaxed text-fg-muted">
              {t('poweredBy')}{' '}
              <a
                href="https://enigmitic.com"
                target="_blank"
                rel="noreferrer"
                /* Padding rather than a min-height: this one sits inside a
                   sentence, so it has to grow its hit area without breaking the
                   line box around it. */
                className="inline-block py-2.5 text-fg-secondary transition-colors hover:text-white"
              >
                Enigmitic
              </a>
            </p>
          </div>

          {/*
            Every one of these was a bare inline link 15 to 20 pixels tall,
            which is under WCAG 2.2's 24px minimum target size — not merely
            under the 44px anyone would want on a phone. `min-h-11` makes each
            row its own 44px target; the vertical gap comes off to compensate,
            so the block occupies roughly the space it did before.
          */}
          <nav
            aria-label={t('navKit')}
            className="-my-2 flex flex-wrap gap-x-8 gap-y-0 text-sm"
          >
            {[
              { key: 'kit', href: '#kit', label: t('navKit'), external: true },
              { key: 'how', href: '#how', label: t('navHow'), external: true },
              { key: 'pricing', href: '/pricing', label: t('navPricing') },
              ...(session ? [] : [{ key: 'login', href: '/login', label: tn('signIn') }]),
              /* Reachable from the page a visitor is on when they decide whether
                 to trust the product with a card — and from the only page Google
                 checks when it verifies the consent screen. */
              { key: 'privacy', href: '/privacy', label: tn('privacy') },
              { key: 'terms', href: '/terms', label: tn('terms') },
            ].map((item) =>
              item.external ? (
                <a
                  key={item.key}
                  href={item.href}
                  className="inline-flex min-h-11 items-center text-fg-secondary transition-colors hover:text-white"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.key}
                  href={item.href}
                  className="inline-flex min-h-11 items-center text-fg-secondary transition-colors hover:text-white"
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>
        </div>
      </footer>
    </div>
  )
}
