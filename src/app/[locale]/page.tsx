import { ArrowRight, Check } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import Image from 'next/image'

import { ManifestRow, StickyBrief } from '@/components/features/landing/manifest'
import {
  AfterHeadline,
  Aurora,
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
    { src: '/marketing/makan-abstract-geometric-icon.webp', style: 'Icon' },
    { src: '/marketing/makan-emblem-badge.webp', style: 'Emblem' },
  ],
} as const

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
    <div className="relative min-h-dvh">
      <Aurora />

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo className="text-xl" markClassName="size-7" animated />
        <nav className="flex items-center gap-2">
          <Link href="/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            {tn('signIn')}
          </Link>
          <Link href="/register" className={buttonVariants({ size: 'sm' })}>
            {t('ctaPrimary')}
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-28 pt-20 sm:pb-40 sm:pt-32">
        <HeadlineWords
          text={t('heroTitle')}
          className="max-w-4xl text-[3.25rem] font-extrabold leading-[0.98] tracking-[-0.04em] sm:text-[5.5rem]"
        />

        <AfterHeadline delay={0.5}>
          {/* Measure held near 60ch: this is a paragraph to read, not a banner. */}
          <p className="mt-8 max-w-[54ch] text-lg leading-relaxed text-fg-secondary sm:text-xl">
            {t('heroLead')}
          </p>
        </AfterHeadline>

        <AfterHeadline delay={0.62}>
          <div className="mt-11 flex flex-wrap items-center gap-3">
            <Link href="/register" className={buttonVariants({ size: 'lg' })}>
              {t('ctaPrimary')}
              <ArrowRight className="rtl:rotate-180" />
            </Link>
            <Link href="/pricing" className={buttonVariants({ variant: 'ghost', size: 'lg' })}>
              {t('ctaSecondary')}
            </Link>
          </div>
        </AfterHeadline>
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
