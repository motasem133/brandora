import { ArrowRight, Check, Sparkles } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import Image from 'next/image'

import { ManifestRow, StickyBrief } from '@/components/features/landing/manifest'
import { FloatCard, HeroBadge } from '@/components/features/landing/float'
import {
  AfterHeadline,
  HeadlineWords,
  LogoTile,
  ParallaxFrame,
} from '@/components/features/landing/motion-hero'
import { buttonVariants } from '@/components/ui/button'
import { Logo, LogoMark } from '@/components/ui/logo'
import { Link } from '@/i18n/navigation'

/**
 * The landing page is one generation run, itemised.
 *
 * The product's claim is that a single brief produces a whole identity, so the
 * page is built as that transaction: the brief pinned on one side, everything
 * it returned listed on the other. Nothing here is a mockup — the brand below
 * came out of this product, and the files shown are the ones it wrote.
 */

/** Real output from a completed run. Labelled as a generated sample on the page. */
const SAMPLE = {
  names: [
    {
      name: 'Makān',
      rationale:
        "Arabic for 'place' or 'space' — minimal and grounded, reflecting the idea of a space to think and find clarity.",
    },
    {
      name: 'Qahwa Sākin',
      rationale:
        "Qahwa (coffee) + Sākin (still/quiet) — Arabic for 'quiet coffee', directly evoking the brand's theme of calm and focus.",
    },
  ],
  slogan: 'Brewed for focus.',
  palette: [
    { name: 'Primary', hex: '#6F4E37' },
    { name: 'Secondary', hex: '#D4A574' },
    { name: 'Accent', hex: '#C08552' },
    { name: 'Background', hex: '#FAF6F0' },
    { name: 'Text', hex: '#2D1B0E' },
  ],
  fonts: { heading: 'Sora', body: 'Inter', accent: 'DM Serif Display' },
  values: ['Intentional Restraint', 'Sensory Clarity', 'Modern Heritage', 'Quiet Confidence'],
  logos: [
    { src: '/marketing/makan-wordmark.webp', style: 'Wordmark' },
    { src: '/marketing/makan-lettermark-monogram.webp', style: 'Lettermark' },
    { src: '/marketing/makan-mark.webp', style: 'Icon' },
    { src: '/marketing/makan-emblem-badge.webp', style: 'Emblem' },
  ],
} as const

type Plan = {
  slug: string
  name: string
  price: number
  credits: number
  once?: boolean
  popular?: boolean
  features: string[]
}

/** The seeded plans. Figures match the database, not marketing rounding. */
const PLANS: Plan[] = [
  { slug: 'free', name: 'Free', price: 0, credits: 10, once: true, features: ['1 full brand generation', '4 logo concepts', 'Colour palette & fonts', 'Brand story'] },
  { slug: 'basic', name: 'Basic', price: 29, credits: 120, features: ['~15 generations / month', 'Website builder', 'SVG vector export', 'Brand kit ZIP', '2 seats'] },
  { slug: 'pro', name: 'Pro', price: 79, credits: 400, popular: true, features: ['~50 generations / month', 'Social media kit', 'Brand Assistant', 'Priority queue', '5 seats'] },
  { slug: 'business', name: 'Business', price: 199, credits: 1200, features: ['~150 generations / month', 'Custom domains', 'Unlimited seats', 'API access', 'Dedicated support'] },
]

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('Landing')
  const tn = await getTranslations('Nav')

  const brief = [
    { label: t('briefBusiness'), value: t('briefValueBusiness') },
    { label: t('briefIndustry'), value: t('briefValueIndustry') },
    { label: t('briefMarket'), value: t('briefValueMarket') },
    { label: t('briefStyle'), value: t('briefValueStyle') },
  ]

  return (
    /*
     * The marketing page runs in the light world regardless of the app's
     * theme: the product sells on an airy, atmospheric first screen, and the
     * dashboard behind the login is where the dark interface belongs.
     */
    <div className="light relative min-h-dvh bg-base text-fg">
      {/* The sky. Three washes in the brand ramp, layered so the horizon reads
          as depth rather than as a single flat gradient. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[1100px]"
        style={{
          background:
            'radial-gradient(70% 55% at 15% 0%, #7C3AED2e, transparent 65%), radial-gradient(60% 50% at 85% 5%, #3B82F62b, transparent 62%), radial-gradient(90% 60% at 50% 38%, #4F46E518, transparent 70%), linear-gradient(180deg, #ffffff 0%, #f6f4ff 42%, #f7f8fc 100%)',
        }}
      />

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo className="text-xl" markClassName="size-7" animated />
        <nav className="flex items-center gap-2">
          <Link href="/pricing" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            {t('ctaSecondary')}
          </Link>
          <Link href="/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            {tn('signIn')}
          </Link>
          <Link href="/register" className={buttonVariants({ size: 'sm' })}>
            {t('ctaPrimary')}
          </Link>
        </nav>
      </header>

      <section className="relative mx-auto max-w-6xl px-6 pb-24 pt-16 text-center sm:pt-24">
        <HeroBadge>
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-white/70 px-4 py-1.5 text-sm text-fg-secondary shadow-[var(--shadow-soft)] backdrop-blur">
            <Sparkles className="size-3.5 text-brand" />
            {t('badge')}
          </span>
        </HeroBadge>

        <div className="mt-8">
          <HeadlineWords
            text={t('heroTitleLead')}
            className="mx-auto max-w-4xl text-[3rem] font-extrabold leading-[1.02] tracking-[-0.04em] sm:text-[5rem]"
          />
          <AfterHeadline delay={0.28}>
            <p className="mx-auto max-w-4xl bg-[image:var(--brand-gradient)] bg-clip-text text-[3rem] font-extrabold leading-[1.02] tracking-[-0.04em] text-transparent sm:text-[5rem]">
              {t('heroTitleAccent')}
            </p>
          </AfterHeadline>
        </div>

        <AfterHeadline delay={0.46}>
          <p className="mx-auto mt-7 max-w-[54ch] text-lg leading-relaxed text-fg-secondary">
            {t('heroLead')}
          </p>
        </AfterHeadline>

        <AfterHeadline delay={0.58}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/register" className={buttonVariants({ size: 'lg' })}>
              {t('ctaPrimary')}
              <ArrowRight className="rtl:rotate-180" />
            </Link>

            <span className="inline-flex items-center gap-3">
              <span className="rounded-control bg-[image:var(--brand-gradient)] px-3 py-2 text-lg font-bold text-white">
                60+
              </span>
              <span className="text-start text-sm leading-tight text-fg-secondary">
                {t('statLabel')}
              </span>
            </span>
          </div>
        </AfterHeadline>

        {/* The output itself, floating over the sky. Real files, not chrome. */}
        <div className="relative mt-16 h-[26rem] sm:h-[30rem]">
          <FloatCard
            className="absolute start-0 top-6 w-56 sm:w-64"
            delay={0.7}
            tilt={-4}
            duration={11}
          >
            <div className="rounded-card bg-white p-4 shadow-[0_24px_60px_-24px_rgba(11,16,32,0.35)]">
              <p className="text-xs font-medium text-fg-muted">Palette</p>
              <div className="mt-3 flex gap-1.5">
                {SAMPLE.palette.map((swatch) => (
                  <span
                    key={swatch.hex}
                    className="h-12 flex-1 rounded-lg"
                    style={{ backgroundColor: swatch.hex }}
                  />
                ))}
              </div>
              <p className="mt-3 text-sm font-semibold">Makān</p>
              <p className="text-xs text-fg-muted">{SAMPLE.slogan}</p>
            </div>
          </FloatCard>

          <FloatCard
            className="absolute inset-x-0 top-0 mx-auto w-64 sm:w-80"
            delay={0.55}
            tilt={0}
            drift={18}
            duration={9}
          >
            <div className="overflow-hidden rounded-card bg-white p-3 shadow-[0_32px_80px_-28px_rgba(11,16,32,0.4)]">
              <Image
                src="/marketing/makan-mark.webp"
                alt="A logo concept generated for Makān"
                width={720}
                height={720}
                className="aspect-square w-full rounded-lg object-contain"
                sizes="320px"
                priority
              />
            </div>
          </FloatCard>

          <FloatCard
            className="absolute end-0 top-16 w-60 sm:w-72"
            delay={0.85}
            tilt={4}
            duration={13}
          >
            <div className="overflow-hidden rounded-card bg-white shadow-[0_24px_60px_-24px_rgba(11,16,32,0.35)]">
              <Image
                src="/marketing/makan-website.webp"
                alt="The published website generated for Makān"
                width={1200}
                height={806}
                className="w-full"
                sizes="288px"
              />
            </div>
          </FloatCard>

          <FloatCard
            className="absolute bottom-0 start-[12%] w-52 sm:w-60"
            delay={1}
            tilt={3}
            drift={10}
            duration={12}
          >
            <div className="rounded-card bg-white p-4 shadow-[0_24px_60px_-24px_rgba(11,16,32,0.35)]">
              <p className="text-xs font-medium text-fg-muted">Typography</p>
              <p className="mt-2 text-xl font-semibold leading-tight">{SAMPLE.fonts.heading}</p>
              <p className="text-sm text-fg-secondary">{SAMPLE.fonts.body}</p>
            </div>
          </FloatCard>
        </div>
      </section>

      {/* ----------------------------------------------------------- manifest */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-12 lg:grid-cols-[20rem_1fr] lg:gap-16">
          <StickyBrief>
            <div className="rounded-panel border border-line bg-surface p-7 shadow-[var(--shadow-soft)]">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-muted">
                {t('briefLabel')}
              </p>

              <dl className="mt-6 space-y-5">
                {brief.map((field) => (
                  <div key={field.label}>
                    <dt className="text-xs text-fg-muted">{field.label}</dt>
                    <dd className="mt-1 text-sm leading-relaxed text-fg">{field.value}</dd>
                  </div>
                ))}
              </dl>

              <p className="mt-7 flex items-center gap-2 border-t border-line pt-5 text-xs text-fg-muted">
                <LogoMark className="size-4" id="brief" />
                {t('sampleNotice')}
              </p>
            </div>
          </StickyBrief>

          <div>
            <h2 className="text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
              {t('manifestTitle')}
            </h2>
            <p className="mt-3 max-w-[58ch] leading-relaxed text-fg-secondary">
              {t('manifestLead')}
            </p>

            <ol className="mt-4">
              <ManifestRow label={t('itemNames')} note={t('itemNamesNote')} index={0}>
                <div className="space-y-5">
                  {SAMPLE.names.map((entry) => (
                    <div key={entry.name}>
                      <p className="text-xl font-semibold tracking-tight">{entry.name}</p>
                      <p className="mt-1 max-w-[62ch] text-sm leading-relaxed text-fg-secondary">
                        {entry.rationale}
                      </p>
                    </div>
                  ))}
                  <p className="text-sm text-fg-muted">
                    {t('sloganLabel')}:{' '}
                    <span className="italic text-fg-secondary">“{SAMPLE.slogan}”</span>
                  </p>
                </div>
              </ManifestRow>

              <ManifestRow label={t('itemPalette')} index={1}>
                <div className="flex flex-wrap gap-3">
                  {SAMPLE.palette.map((swatch) => (
                    <div key={swatch.hex} className="w-28">
                      <div
                        className="h-20 w-full rounded-control border border-line"
                        style={{ backgroundColor: swatch.hex }}
                      />
                      <p className="mt-2 text-xs text-fg-secondary">{swatch.name}</p>
                      <p className="text-xs text-fg-muted">{swatch.hex}</p>
                    </div>
                  ))}
                </div>
              </ManifestRow>

              <ManifestRow label={t('itemLogos')} note={t('itemLogosNote')} index={3}>
                <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
                  {SAMPLE.logos.map((logo, index) => (
                    <LogoTile key={logo.src} index={index}>
                      <figure>
                        <div className="overflow-hidden rounded-card bg-white shadow-[var(--shadow-soft)]">
                          <Image
                            src={logo.src}
                            alt={`${logo.style} logo concept generated for Makān`}
                            width={720}
                            height={720}
                            className="aspect-square w-full object-contain"
                            sizes="(max-width: 640px) 45vw, 180px"
                          />
                        </div>
                        <figcaption className="mt-3 text-xs text-fg-muted">{logo.style}</figcaption>
                      </figure>
                    </LogoTile>
                  ))}
                </div>
              </ManifestRow>

              <ManifestRow label={t('itemWebsite')} note={t('itemWebsiteNote')} index={5}>
                <ParallaxFrame>
                  <Image
                    src="/marketing/makan-website.webp"
                    alt="The published website generated for Makān"
                    width={1200}
                    height={806}
                    className="w-full scale-[1.06]"
                    sizes="(max-width: 1024px) 90vw, 640px"
                  />
                </ParallaxFrame>
              </ManifestRow>

            </ol>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- argument */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 lg:grid-cols-3 lg:gap-16">
          {[
            { title: t('coherenceTitle'), body: t('coherenceBody') },
            { title: t('editTitle'), body: t('editBody') },
            { title: t('arabicTitle'), body: t('arabicBody') },
          ].map((block) => (
            <div key={block.title}>
              <h2 className="text-2xl font-bold leading-tight tracking-[-0.03em]">{block.title}</h2>
              <p className="mt-4 max-w-[52ch] leading-relaxed text-fg-secondary">{block.body}</p>
            </div>
          ))}
        </div>
      </section>


      {/* ------------------------------------------------------------ pricing */}
      <section className="border-t border-line bg-white/60">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-extrabold tracking-[-0.035em] sm:text-5xl">
              {t('pricingTitle')}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-fg-secondary">{t('pricingLead')}</p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan, index) => (
              <LogoTile key={plan.slug} index={index}>
                <div
                  className={
                    plan.popular
                      ? 'relative flex h-full flex-col rounded-panel bg-[image:linear-gradient(160deg,#7C3AED,#4F46E5_55%,#3B82F6)] p-7 text-white shadow-[0_30px_70px_-30px_rgba(79,70,229,0.75)]'
                      : 'relative flex h-full flex-col rounded-panel border border-line bg-white p-7 shadow-[var(--shadow-soft)]'
                  }
                >
                  {plan.popular && (
                    <span className="absolute end-6 top-6 rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
                      {t('pricingPopular')}
                    </span>
                  )}

                  <p className={plan.popular ? 'text-sm text-white/80' : 'text-sm text-fg-secondary'}>
                    {plan.name}
                  </p>

                  <p className="mt-3 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold tracking-[-0.03em]">
                      {plan.price === 0 ? t('pricingFree') : `$${plan.price}`}
                    </span>
                    {plan.price > 0 && (
                      <span className={plan.popular ? 'text-sm text-white/70' : 'text-sm text-fg-muted'}>
                        {t('pricingPerMonth')}
                      </span>
                    )}
                  </p>

                  <p className={plan.popular ? 'mt-2 text-sm text-white/80' : 'mt-2 text-sm text-fg-secondary'}>
                    {plan.once
                      ? t('pricingCreditsOnce', { credits: plan.credits })
                      : t('pricingCredits', { credits: plan.credits })}
                  </p>

                  <ul className="mt-6 flex-1 space-y-2.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check
                          className={
                            plan.popular
                              ? 'mt-0.5 size-4 shrink-0 text-white'
                              : 'mt-0.5 size-4 shrink-0 text-brand'
                          }
                        />
                        <span className={plan.popular ? 'text-white/90' : 'text-fg-secondary'}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/register"
                    className={
                      plan.popular
                        ? 'mt-7 inline-flex h-11 items-center justify-center rounded-control bg-white px-5 text-sm font-semibold text-brand transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]'
                        : `mt-7 ${buttonVariants({ variant: plan.price === 0 ? 'primary' : 'secondary', size: 'md' })}`
                    }
                  >
                    {plan.price === 0 ? t('pricingCta') : t('pricingCtaPaid', { plan: plan.name })}
                  </Link>
                </div>
              </LogoTile>
            ))}
          </div>

          <p className="mt-8 text-sm text-fg-muted">{t('pricingAll')}</p>
        </div>
      </section>

      {/* ----------------------------------------------------------- closing */}
      <section className="mx-auto max-w-6xl px-6 py-28">
        <h2 className="text-4xl font-extrabold tracking-[-0.035em] sm:text-6xl">
          {t('closingTitle')}
        </h2>
        <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-fg-secondary">
          {t('closingBody')}
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-4">
          <Link href="/register" className={buttonVariants({ size: 'lg' })}>
            {t('ctaPrimary')}
            <ArrowRight className="rtl:rotate-180" />
          </Link>
          <span className="inline-flex items-center gap-2 text-sm text-fg-muted">
            <Check className="size-4 text-success" />
            {t('priceFrom')}
          </span>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8">
          <Logo className="text-base" markClassName="size-5" />
          <Link href="/pricing" className="text-sm text-fg-secondary hover:text-fg">
            {t('ctaSecondary')}
          </Link>
        </div>
      </footer>
    </div>
  )
}
