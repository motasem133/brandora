import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { ContactSheet } from '@/components/features/landing/contact-sheet'
import { StartCta } from '@/components/features/landing/start-cta'
import { SULTANA } from '@/components/features/landing/sultana'
import { FaqJsonLd } from '@/components/seo/json-ld'
import { buttonVariants } from '@/components/ui/button'
import { Disclosure } from '@/components/ui/disclosure'
import { Eyebrow } from '@/components/ui/eyebrow'
import { SectionReveal } from '@/components/ui/horizon'
import { Link } from '@/i18n/navigation'
import { alternatesFor, socialMeta } from '@/lib/seo'
import { BRAND_COST, CREDIT_COSTS } from '@/server/billing/credits'
import { getSession } from '@/server/session'

/**
 * The deliverables, at length.
 *
 * The landing page already has a kit section, and this is deliberately not a
 * second copy of it: there the sheet is one beat in an argument that has to keep
 * moving, and the question it cannot stop to answer is what the files actually
 * are, what they cost and what you may do with them. This page is that answer,
 * and it is the first one written for a search rather than for a visitor who
 * already arrived — "what is in a brand kit" is a question people type, and the
 * site had four pages, none of which was about the product's own output.
 *
 * It shares `ContactSheet` with the landing page rather than restating it. The
 * sheet is the strongest thing either page has — real files from a real run,
 * named by position — and a second grid built from the same constants is how the
 * two end up disagreeing about how many logo concepts there are.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Meta' })
  const common = await getTranslations({ locale, namespace: 'Common' })

  const title = t('brandKitTitle')
  const description = t('brandKitDescription')

  return {
    title,
    description,
    alternates: alternatesFor(locale, '/brand-kit'),
    ...socialMeta({
      locale,
      path: '/brand-kit',
      title: `${title} · ${common('appName')}`,
      description,
      siteName: common('appName'),
      imageAlt: t('ogAlt'),
    }),
  }
}

/**
 * The run's sections, in the order the pipeline generates them.
 *
 * Read from `CREDIT_COSTS` rather than written out, for the same reason the
 * pricing page's offers are read from `plans`: this table is a price list, and a
 * price that is one number in the biller and another on the page is the one kind
 * of drift a customer discovers by being charged.
 */
const SECTIONS = ['branding', 'logos', 'website', 'social', 'kit'] as const

export default async function BrandKitPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('BrandKit')
  const landing = await getTranslations('Landing')
  const pricing = await getTranslations('Pricing')
  const session = await getSession()

  const faq = t.raw('faq') as { q: string; a: string }[]

  return (
    <div className="world-dark min-h-dvh">
      <FaqJsonLd items={faq} />

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="font-display text-xl font-bold accent-text">
          Brandora
        </Link>
        <nav className="flex items-center gap-2">
          {!session && (
            <Link href="/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
              {pricing('signIn')}
            </Link>
          )}
          <StartCta size="sm" />
        </nav>
      </header>

      <main id="content" tabIndex={-1}>
        {/* ------------------------------------------------------------ hero --- */}
        <section className="mx-auto max-w-6xl px-6 pb-16 pt-10 sm:pt-16">
          <SectionReveal>
            <Eyebrow>{t('eyebrow')}</Eyebrow>
            <h1 className="type-display mt-5 max-w-4xl">{t('title')}</h1>
            <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-fg-secondary">
              {t('lede')}
            </p>
          </SectionReveal>
        </section>

        {/*
          ------------------------------------------------------------ files ---
          Sultana's own paper, exactly as the landing page does it: `world-light`
          re-points the chrome tokens at the guest variables `brandTheme` emits,
          so the marks sit on the ground they were designed for rather than on
          the app's near-black. Spreading `SULTANA.vars` is what supplies them.
        */}
        <section className="world-light py-20 sm:py-28" style={SULTANA.vars}>
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <SectionReveal>
              <Eyebrow>{t('exampleEyebrow')}</Eyebrow>
              <h2 className="type-section mt-4 max-w-3xl">{t('exampleTitle')}</h2>
              <p className="mt-5 max-w-[58ch] text-lg leading-relaxed text-fg-secondary">
                {t('exampleBody')}
              </p>
            </SectionReveal>

            <ContactSheet />

            <SectionReveal>
              <div className="mt-20 grid gap-8 border-t border-line pt-14 lg:grid-cols-12">
                <h3 className="type-section lg:col-span-5">{landing('coherenceTitle')}</h3>
                <p className="max-w-[46ch] text-lg leading-relaxed text-fg-secondary lg:col-span-7">
                  {landing('coherenceBody')}
                </p>
              </div>
            </SectionReveal>
          </div>
        </section>

        {/* ------------------------------------------------------------ cost --- */}
        <section className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <SectionReveal>
            <Eyebrow>{t('costEyebrow')}</Eyebrow>
            <h2 className="type-section mt-4">{t('costTitle')}</h2>
            <p className="mt-5 max-w-[54ch] text-lg leading-relaxed text-fg-secondary">
              {t('costBody')}
            </p>
          </SectionReveal>

          <SectionReveal className="mt-10">
            {/*
              A real table, because it is one: two columns of paired values with
              a summary row. Built as a grid of divs it would announce as a pile
              of text, and the total would lose its association with the rows it
              totals.
            */}
            <table className="w-full max-w-xl border-collapse text-start">
              <caption className="sr-only">{t('costTitle')}</caption>
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="type-eyebrow py-3 text-start text-fg-muted">
                    {t('costSection')}
                  </th>
                  <th scope="col" className="type-eyebrow py-3 text-end text-fg-muted">
                    {t('costCredits')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {SECTIONS.map((key) => (
                  <tr key={key} className="border-b border-line/60">
                    <th scope="row" className="py-3.5 text-start font-normal text-fg">
                      {t(`costLabels.${key}`)}
                    </th>
                    <td className="py-3.5 text-end font-mono tabular-nums text-fg">
                      {CREDIT_COSTS[key]}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-line-strong">
                  <th scope="row" className="py-4 text-start font-display font-semibold text-fg">
                    {t('costTotal')}
                  </th>
                  <td className="py-4 text-end font-mono font-semibold tabular-nums text-fg">
                    {BRAND_COST}
                  </td>
                </tr>
              </tfoot>
            </table>

            <p className="mt-6 max-w-[54ch] text-sm leading-relaxed text-fg-secondary">
              {t('costNote')}
            </p>

            <Link
              href="/pricing"
              className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'mt-4 -ms-3' })}
            >
              {t('costLink')}
            </Link>
          </SectionReveal>
        </section>

        {/* ------------------------------------------------------------- faq --- */}
        <section className="mx-auto max-w-6xl px-6 pb-20 sm:pb-28">
          <SectionReveal>
            <h2 className="type-section">{t('faqTitle')}</h2>
            <div className="mt-8 grid items-start gap-3 lg:grid-cols-2 lg:gap-x-5">
              {faq.map((item) => (
                <Disclosure key={item.q} title={item.q}>
                  <p className="max-w-[52ch] text-sm leading-relaxed text-fg-secondary">
                    {item.a}
                  </p>
                </Disclosure>
              ))}
            </div>
          </SectionReveal>
        </section>

        {/* ------------------------------------------------------------- cta --- */}
        <section className="border-t border-line">
          <div className="mx-auto max-w-6xl px-6 py-20 text-center sm:py-24">
            <SectionReveal>
              <h2 className="type-section">{t('ctaTitle')}</h2>
              <p className="mx-auto mt-4 max-w-[42ch] text-lg text-fg-secondary">
                {t('ctaBody')}
              </p>
              <div className="mt-8 flex justify-center">
                <StartCta size="lg" />
              </div>
            </SectionReveal>
          </div>
        </section>
      </main>
    </div>
  )
}
