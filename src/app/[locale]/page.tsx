import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { ArabicProof } from '@/components/features/landing/arabic-proof'
import { ContactSheet } from '@/components/features/landing/contact-sheet'
import { GuestHandover } from '@/components/features/landing/guest-handover'
import { HeroArtefacts } from '@/components/features/landing/hero-stage'
import { PricingFaq } from '@/components/features/landing/pricing-faq'
import { PricingPlans } from '@/components/features/landing/pricing-plans'
import { StartCta } from '@/components/features/landing/start-cta'
import { SULTANA } from '@/components/features/landing/sultana'
import { SiteJsonLd } from '@/components/seo/json-ld'
import { Cell, SectionReveal } from '@/components/ui/horizon'
import { LogoMark } from '@/components/ui/logo'
import { Link } from '@/i18n/navigation'
import { alternatesFor, socialMeta } from '@/lib/seo'
import { getSession } from '@/server/session'

/**
 * The landing page: proof, arithmetic, and the gap a subscription closes.
 *
 * This replaces "The Run", and the reason is a number rather than a taste.
 * Twenty-one accounts, seventeen verified, seventeen generated a brand, and
 * **zero checkouts ever started** — not abandoned at a price, never reached one.
 * Fourteen of those seventeen projects have no website and no kit, which are
 * precisely the two things Creator and Studio sell. Six of the seven growth
 * fixes shipped against the old page and none of them moved anything. A page
 * that argues harder for signing up is aimed at the half of the funnel that
 * already works.
 *
 * So the page is built on the two levers a landing page actually has here.
 *
 * **Trust, without any of the usual instruments.** PRODUCT.md is explicit: no
 * customers, no testimonials, no usage numbers, no press, no funding, no
 * awards, no "trusted by" row — none exist, and inventing them is forbidden.
 * That rules out the entire conventional playbook and leaves three honest
 * devices, which are the page's three main beats: the complete artefact shown
 * unabridged and labelled as generated output; the arithmetic published as an
 * itemised bill; and the limits published beside the price.
 *
 * **The paid deliverables, named before an account is asked for.** The website
 * and the kit are shown as artefacts rather than listed as features, so a
 * visitor meets the gap here rather than discovering it as a wall after their
 * one free run.
 *
 * It is also light. The app dropped its dark theme, and `.world-dark` on this
 * page was a pinned commitment that the owner reopened by asking for a page
 * built to earn trust: near-black chrome is the category's costume for AI tools,
 * and a page whose entire argument is "look at the actual work" cannot also
 * stage that work in a dark room. The commitment is not deleted — the marketing
 * dark still exists as a scope and the legal pages still use it — but this
 * surface no longer opts into it.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Meta' })
  const common = await getTranslations({ locale, namespace: 'Common' })

  const title = `${t('homeTitle')} · ${common('appName')}`
  const description = t('homeDescription')

  return {
    title: { absolute: title },
    description,
    alternates: alternatesFor(locale, ''),
    ...socialMeta({
      locale,
      path: '',
      title,
      description,
      siteName: common('appName'),
      imageAlt: t('ogAlt'),
    }),
  }
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('Landing')
  const tc = await getTranslations('Common')
  const tm = await getTranslations('Meta')
  const tn = await getTranslations('Nav')
  const tp = await getTranslations('Pricing')
  const session = await getSession()

  const receiptLines = t.raw('receiptLines') as { t: string; s: string; c: string }[]
  const limits = t.raw('limitsItems') as { t: string; s: string }[]
  const gapHas = t.raw('gapHas') as string[]
  const gapMissing = t.raw('gapMissing') as string[]
  const gapAdds = t.raw('gapAdds') as string[]

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

  const nav = [
    { href: '#kit', label: t('navKit') },
    { href: '#bill', label: tp('faqTitle') },
    { href: '#pricing', label: t('navPricing') },
  ]

  return (
    <div className="min-h-dvh overflow-x-hidden">
      <SiteJsonLd
        locale={locale}
        name={tc('appName')}
        description={tm('homeDescription')}
        category={tm('applicationCategory')}
      />

      {/*
        One quiet authored light behind the whole page, the same single source
        the app shell uses. Not a gradient repeated per section — that is how an
        accent stops meaning anything.
      */}
      <div
        aria-hidden
        className="world-glow"
      />

      <header className="glass sticky top-0 z-40 border-b border-line">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5 lg:px-8">
          <span className="flex items-center gap-2.5">
            <LogoMark className="size-9" />
            <span className="font-display text-lg font-semibold tracking-[-0.01em]">Brandora</span>
          </span>

          {/* `min-h-11` on each item: as bare inline links these measured 20px
              tall, which is under WCAG 2.2's 24px floor on the pointer devices
              that are the only ones ever to see this row. */}
          <nav className="hidden items-center gap-8 text-sm text-fg-secondary md:flex">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="inline-flex min-h-11 items-center transition-colors hover:text-fg"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <StartCta size="sm" />
        </div>
      </header>

      <main id="content" className="relative z-10">
        {/* ------------------------------------------------------------ hero */}
        {/*
          Bold, and light — the system is light and a single dark section is
          still a second visual system on the page most visitors only ever see.
          The contrast here is ink on ground at 16.1:1, which is higher than the
          white-on-black heroes this was measured against; what makes a fold
          bold is the size of the type and the presence of the subject, not the
          darkness behind them.

          No negative margin either. Pulling the section up under a sticky
          header to fake a full-bleed left a 5px strip of ground showing above
          it: the header is 73px and the pull was 68px. A light hero needs
          neither the pull nor the arithmetic.
        */}
        <section className="relative overflow-hidden border-b border-line">
          <div className="mx-auto flex w-full max-w-7xl items-center gap-16 px-6 py-24 lg:px-8 lg:py-32">
            <div className="min-w-0 flex-1">
              {/*
                `clamp` with a rem term as well as a vw one: a pure `vw` display
                size is frozen against the reader's own font size, so at 200%
                root it would grow a fraction of what the body does and the
                hierarchy would invert for exactly the person who needed it
                most. DESIGN.md's Hero step.
              */}
              <h1
                className="font-display text-balance font-semibold leading-[0.98] tracking-[-0.045em]"
                style={{ fontSize: 'clamp(2.75rem, 1.2rem + 5.6vw, 6.5rem)' }}
              >
                {t('trustHeroLead')}
              </h1>
              <p className="mt-7 max-w-xl text-base leading-relaxed text-fg-secondary sm:text-lg">
                {t('trustHeroDeck')}
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <StartCta size="lg" />
                <span className="text-sm text-fg-muted">{t('planNoCard')}</span>
              </div>

              {/*
                Required by PRODUCT.md, and load-bearing rather than a
                disclaimer: what sits beside this is the product's own output.
                Two of the three reference pages fill the same slot with
                invented company names.
              */}
              <p className="mt-12 font-mono text-xs text-fg-muted">
                {t('sampleNotice')} · Sultana · {t('receiptTotalValue')}
              </p>
            </div>

            <HeroArtefacts />
          </div>
        </section>

        {/* ------------------------------------------------- the whole kit */}
        {/*
          `world-light` re-points every chrome token at the `--guest-*` variables
          `brandTheme` emits, so this section is drawn in Sultana's own ink
          rather than ours. It is the page's central claim made structurally: a
          product that sells brand coherence hands a whole section over to a
          brand it generated, and nothing here is a mock-up.
        */}
        <GuestHandover>
        <section
          id="kit"
          className="world-light border-y border-line py-16 sm:py-20"
          style={SULTANA.vars}
        >
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="font-display max-w-2xl text-balance text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                {t('kitTitle')} <span className="text-accent">{t('kitTitleAccent')}</span>
              </h2>
              {/* Required by PRODUCT.md: any example shown is labelled as
                  generated output, never implied to be a customer. */}
              <span className="rounded-full border border-line px-3 py-1.5 font-mono text-xs text-fg-muted">
                {t('sampleNotice')}
              </span>
            </div>

            <ContactSheet />
          </div>
        </section>
        </GuestHandover>

        {/* --------------------------------------------------------- the bill */}
        <section id="bill" className="mx-auto max-w-7xl px-6 py-16 sm:py-20 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_.9fr]">
            <div>
              <h2 className="font-display text-balance text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                {t('receiptTitle')}
              </h2>
              <p className="mt-4 max-w-xl text-fg-secondary">{t('receiptDeck')}</p>

              <div className="mt-8 overflow-hidden rounded-card border border-line bg-surface shadow-[var(--shadow-soft)]">
                <div className="flex items-baseline justify-between border-b border-line px-5 py-4">
                  <span className="text-sm font-semibold">{t('receiptTotal')}</span>
                  <span className="font-mono text-xs text-fg-muted">{t('receiptRun')}</span>
                </div>

                {/* The bill prints. `Cell` is the product's own staggered
                    arrival and already caps its delay, so the last line never
                    waits on a phone; `lift={false}` because a row of figures is
                    not a pressable card. */}
                <ol>
                  {receiptLines.map((line, index) => (
                    <Cell key={line.t} index={index} lift={false}>
                    <li
                      className="flex items-center gap-4 border-b border-line px-5 py-3.5"
                    >
                      <span className="w-6 shrink-0 font-mono text-xs text-fg-muted tabular-nums">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{line.t}</span>
                        <span className="block text-xs text-fg-muted">{line.s}</span>
                      </span>
                      <span className="shrink-0 font-mono text-xs tabular-nums">{line.c}</span>
                    </li>
                    </Cell>
                  ))}
                </ol>

                <div className="flex items-center justify-between bg-elevated px-5 py-4">
                  <span className="text-sm font-semibold">{t('receiptTotal')}</span>
                  <span className="font-mono text-base tabular-nums">{t('receiptTotalValue')}</span>
                </div>
              </div>
            </div>

            {/* ------------------------------------------- free vs paid, shown */}
            {/*
              The conversion beat, and the reason this page exists in this shape.
              Fourteen of seventeen projects in the database have no website and
              no kit — the two things a subscription buys — so the difference is
              drawn rather than tabulated, and it is drawn before an account is
              asked for rather than met as a wall afterwards.
            */}
            <div>
              <h2 className="font-display text-balance text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                {t('gapTitle')}
              </h2>
              <p className="mt-4 text-fg-secondary">{t('gapDeck')}</p>

              <div className="mt-8 space-y-4">
                <SectionReveal>
                <div className="rounded-card border border-line bg-surface p-5 shadow-[var(--shadow-soft)]">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-semibold">{t('gapFreeTitle')}</span>
                    <span className="font-mono text-xs text-fg-muted">{t('gapFreeMeta')}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {gapHas.map((item) => (
                      <span
                        key={item}
                        className="rounded-full bg-elevated px-2.5 py-1 text-xs text-fg-secondary"
                      >
                        {item}
                      </span>
                    ))}
                    {/* Dashed rather than dimmed: a thing you do not have is a
                        gap, not a broken control. */}
                    {gapMissing.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-dashed border-line-strong px-2.5 py-1 text-xs text-fg-muted"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                </SectionReveal>

                {/* A beat behind the free card on purpose: the two arriving
                    together reads as a comparison, and one arriving after the
                    other reads as the thing that is missing. */}
                <SectionReveal delay={0.18}>
                <div className="rounded-card border border-brand/30 bg-[color-mix(in_srgb,var(--brand-primary)_5%,var(--bg-surface))] p-5 shadow-[var(--shadow-soft)]">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-semibold">{t('gapPaidTitle')}</span>
                    <span className="font-mono text-xs text-fg-muted">{t('gapPaidMeta')}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {gapAdds.map((item) => (
                      <span
                        key={item}
                        className="rounded-full bg-[color-mix(in_srgb,var(--brand-primary)_12%,transparent)] px-2.5 py-1 text-xs font-medium text-accent"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                </SectionReveal>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ arabic */}
        <section className="border-y border-line bg-elevated/60 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <h2 className="font-display max-w-2xl text-balance text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
              {t('arabicTitle')}
            </h2>
            <p className="mt-4 max-w-2xl text-fg-secondary">{t('arabicBody')}</p>

            <div className="mt-10">
              <ArabicProof
                en={briefOf(ten)}
                ar={briefOf(tar)}
                toggleAria={t('arabicToggleAria')}
              />
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- the limits */}
        {/*
          The one device a product with no customers has that a dishonest
          competitor cannot copy. PRODUCT.md already records the client's rule —
          omit what is not built rather than print it as coming soon — and this
          section is that rule turned outward: the same discipline, said out
          loud, on the page that asks for money.
        */}
        <section className="mx-auto max-w-7xl px-6 py-16 sm:py-20 lg:px-8">
          <h2 className="font-display text-balance text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            {t('limitsTitle')}
          </h2>
          <p className="mt-4 max-w-2xl text-fg-secondary">{t('limitsDeck')}</p>

          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {limits.map((item, index) => (
              <Cell key={item.t} index={index} lift={false}>
              <li
                className="rounded-card border border-line bg-surface p-5 shadow-[var(--shadow-soft)]"
              >
                <p className="text-sm font-semibold">{item.t}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-secondary">{item.s}</p>
              </li>
              </Cell>
            ))}
          </ul>
        </section>

        {/* ------------------------------------------------------- pricing */}
        <section id="pricing" className="border-y border-line bg-elevated/60 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <h2 className="font-display max-w-3xl text-balance text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
              {t('pricingHeading')}
            </h2>
            <p className="mt-4 max-w-2xl text-fg-secondary">{t('pricingDeck')}</p>

            <div className="mt-12">
              <PricingPlans locale={locale} />
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------------- faq */}
        <section id="faq" className="mx-auto max-w-7xl px-6 py-16 sm:py-20 lg:px-8">
          <h2 className="font-display text-balance text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            {tp('faqTitle')}
          </h2>
          <PricingFaq columns className="mt-10" />
        </section>

        {/* --------------------------------------------------------- close */}
        <section className="border-t border-line bg-elevated/60 py-20 sm:py-24">
          <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
            <h2 className="font-display text-balance text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
              {t('closeTitle')} <span className="text-accent">{t('closeTitleAccent')}</span>
            </h2>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <StartCta size="lg" />
              <span className="text-sm text-fg-muted">{t('planNoCard')}</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 lg:flex-row lg:items-start lg:justify-between lg:px-8">
          <div className="max-w-xs">
            <span className="flex items-center gap-2.5">
              <LogoMark className="size-8" />
              <span className="font-display text-base font-semibold">Brandora</span>
            </span>
            <p className="mt-4 text-xs leading-relaxed text-fg-muted">
              {t('poweredBy')}{' '}
              <a
                href="https://enigmitic.com"
                target="_blank"
                rel="noreferrer"
                /* Padding rather than a min-height: this one sits inside a
                   sentence, so it has to grow its hit area without breaking the
                   line box around it. */
                className="inline-block py-2.5 text-fg-secondary transition-colors hover:text-fg"
              >
                Enigmitic
              </a>
            </p>
          </div>

          {/*
            Every one of these was a bare inline link 15 to 20 pixels tall,
            which is under WCAG 2.2's 24px minimum target size. `min-h-11` makes
            each row its own 44px target; the vertical gap comes off to
            compensate, so the block occupies roughly the space it did before.
          */}
          <nav aria-label={t('navKit')} className="-my-2 flex flex-wrap gap-x-8 gap-y-0 text-sm">
            {[
              { key: 'kit', href: '#kit', label: t('navKit'), external: true },
              { key: 'pricing', href: '/pricing', label: t('navPricing') },
              /* The deliverables page. It is announced in the sitemap, but a
                 page nothing links to is a page a crawler reaches last and
                 trusts least. */
              { key: 'brandKit', href: '/brand-kit', label: tn('brandKit') },
              ...(session ? [] : [{ key: 'login', href: '/login', label: tn('signIn') }]),
              /* Reachable from the page a visitor is on when they decide whether
                 to trust the product with a card. */
              { key: 'privacy', href: '/privacy', label: tn('privacy') },
              { key: 'terms', href: '/terms', label: tn('terms') },
            ].map((item) =>
              item.external ? (
                <a
                  key={item.key}
                  href={item.href}
                  className="inline-flex min-h-11 items-center text-fg-secondary transition-colors hover:text-fg"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.key}
                  href={item.href}
                  className="inline-flex min-h-11 items-center text-fg-secondary transition-colors hover:text-fg"
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
