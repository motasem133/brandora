import { getTranslations, setRequestLocale } from 'next-intl/server'
import Image from 'next/image'

import { BrandDrawer } from '@/components/features/landing/brand-drawer'
import { BrandStage } from '@/components/features/landing/brand-stage'
import { SPECIMENS } from '@/components/features/landing/specimens'
import type { Specimen } from '@/components/features/landing/specimens'
import { TermsTable } from '@/components/features/landing/terms-table'
import { SectionReveal } from '@/components/ui/horizon'
import { LogoMark } from '@/components/ui/logo'
import { Link } from '@/i18n/navigation'

/**
 * The landing page as the thing the product makes.
 *
 * Three earlier passes at this page moved pictures between slots and recoloured
 * details, and the page went on reading as a template, because the template was
 * never the palette, it was the composition. Read as shapes, what stood here was
 * the stock AI-product landing page with nothing left out: badge pill, giant
 * headline, deck, two calls to action, product shot on the right; a glowing arc
 * behind three dark sections; gradient pill controls; steps one to five down a
 * lit rail; four pricing cards with the second one scaled up and badged; nine
 * collapsed accordion rows; a centred closing line; a footer of link columns.
 * Not one of those is wrong. Together they are anonymous, and no amount of
 * retinting reaches them.
 *
 * So the composition is the change. Brandora's output is a printed brand book,
 * paper, plates, a palette laid along a base, a PDF a customer downloads, and
 * this page is set as one instead of as a dark page with photographs of one on
 * it. Running heads, plate numbers, captions in the margin, a terms page rather
 * than a pricing grid, notes rather than an accordion, a colophon rather than a
 * closing hero. The claim is that this product makes work that does not look
 * like everybody else's; the page had no standing to make it.
 *
 * The one thing that carries over untouched is the argument the fold already
 * won: a real generated brand, wearing itself, through `brandTheme()`, the same
 * code path four screens behind the login use.
 */
export default async function BrandBook({
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
   * so `/ar` rendered English inside an RTL frame, the bidi algorithm
   * reordering it into "brand entire Your ,identity" on the one surface that
   * has to prove the product generates Arabic natively.
   */
  const t = await getTranslations('Landing')
  const tn = await getTranslations('Nav')
  const tp = await getTranslations('Pricing')
  const rest = t.raw('restItems') as string[]
  const steps = t.raw('steps') as { name: string; body: string }[]
  const notes = tp.raw('faq') as { q: string; a: string }[]

  /*
   * The two lines are treated differently because they are different things.
   *
   * Sultana's is ours, an editorial gloss on why the run picked that name, so
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

  /* A book's margins are wide and its measure is short. A landing page's are
     neither, which is most of why one reads as printed and the other does not. */
  const page = 'mx-auto w-full max-w-[78rem] px-6 sm:px-10 lg:px-16'

  return (
    <div className="world-paper min-h-dvh overflow-x-hidden">
      {/*
        The running head, which is what a book has instead of a navigation bar.

        It is the same links, set as apparatus: the title of the book on one
        side, where you are in it on the other. The rule under it runs the full
        measure rather than fading, because on a printed page a rule is a rule,
        the fade existed to stop a full-bleed line reading as a template frame on
        a dark page, and a page with margins does not have that problem.
      */}
      {/* `bg-base` is deliberately not a registered colour utility, it would
          compile `.text-base` to a colour instead of a font size, so the ground
          is mixed from the token directly. */}
      <header className="sticky top-0 z-30 border-b border-line bg-[color-mix(in_srgb,var(--bg-base)_88%,transparent)] backdrop-blur">
        <div className={`${page} flex items-center justify-between gap-6 py-3.5`}>
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark className="size-7" />
            <span className="type-runhead !text-fg">Brandora</span>
          </Link>

          <nav className="hidden items-center gap-9 md:flex">
            <a href="#specimens" className="type-runhead transition-colors hover:!text-fg">
              {t('navKit')}
            </a>
            <a href="#process" className="type-runhead transition-colors hover:!text-fg">
              {t('navHow')}
            </a>
            <a href="#terms" className="type-runhead transition-colors hover:!text-fg">
              {t('navPricing')}
            </a>
          </nav>

          <Link href="/register" className="stamp !px-5 !py-2.5">
            {t('ctaPrimary')}
          </Link>
        </div>
      </header>

      {/*
        Without JavaScript, the elements below the fold stayed at `opacity: 0`
        for good, thousands of pixels of blank ground on a phone, because the
        reveal never fired. The reveal is an enhancement; the content is not
        conditional on it.
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
        {/* ---------------------------------------------------------- cover */}
        {/*
          A title page, not a hero.

          What stood here was a badge pill above three lines of display type
          above a deck above two controls, beside a product shot, the fold of
          every AI product on the internet, drawn from the same parts in the same
          order. A book opens on its title: the name of the thing, what it is,
          and nothing else competing for the same glance. The controls stay,
          because this page still has to sell, but they sit below the title as
          the imprint line rather than as the second thing you see.
        */}
        <section className={`${page} pb-24 pt-20 sm:pb-32 sm:pt-32`}>
          <div className="flex items-baseline justify-between gap-6 border-b border-line-strong pb-4">
            <span className="type-runhead">{t('coverImprint')}</span>
            <span className="type-runhead">{t('coverEdition')}</span>
          </div>

          <SectionReveal>
            {/* A wider measure in Arabic. `ch` is the width of a `0` in the
                current font, so 19ch set on Amiri is a much shorter line than
                19ch set on Fraunces, and the Arabic title broke with its last
                word alone on a third line. */}
            <h1 className="type-plate mt-12 max-w-[19ch] rtl:max-w-[26ch]">
              {t('heroHeadline')} <span className="text-fg-secondary">{t('heroHeadlineAfter')}</span>
            </h1>
          </SectionReveal>

          <SectionReveal delay={0.12}>
            {/*
              The measure is 52 characters, which is a book's, not a landing
              page's 70-plus. It is the single cheapest thing that makes a block
              of text read as typeset rather than as filled to the container.
            */}
            <p className="mt-10 max-w-[52ch] text-lg leading-[1.7] text-fg-secondary">
              {t('heroDeck')}
            </p>
          </SectionReveal>

          <SectionReveal delay={0.2}>
            <div className="mt-12 flex flex-wrap items-center gap-4">
              <Link href="/register" className="stamp">
                {t('ctaPrimary')}
              </Link>
              <Link href="#terms" className="stamp-quiet">
                {t('ctaSecondary')}
              </Link>
            </div>
          </SectionReveal>
        </section>

        {/* ------------------------------------------------------ plate 01 */}
        {/*
          The plates are numbered and captioned because that is what makes a
          sequence of sections read as one document rather than as blocks
          stacked by a page builder. A visitor who has seen "PLATE 01" knows
          there is a plate 02 without being told, which is work a scroll cue
          used to do with an animation.
        */}
        <section id="specimens" className={`${page} pb-24 sm:pb-32`}>
          {/* Not `stageWall` here: `BrandStage` already prints that line under
              its own plate, and the two sat a screen apart saying the same
              sentence twice. */}
          <PlateHead
            label={t('plateLabel')}
            number="01"
            title={t('plateSpecimen')}
            note={t('plateSpecimenNote')}
          />

          <SectionReveal>
            <BrandStage className="mt-10" specimens={specimens} labels={stageLabels} />
          </SectionReveal>
        </section>

        {/* ------------------------------------------------------ plate 02 */}
        <section className={`${page} pb-24 sm:pb-32`}>
          <PlateHead label={t("plateLabel")} number="02" title={t('kitTitle')} note={t('kitTitleAccent')} />

          {/*
            A cabinet of runs, each wearing its own paper. Kept from the pass
            before this one: it was the one section below the fold that was
            already arguing in the customer's colours rather than in ours.
          */}
          <div className="mt-10 grid gap-4">
            {specimens.map((specimen, index) => (
              <SectionReveal key={specimen.id} delay={Math.min(index * 0.08, 0.3)}>
                <BrandDrawer specimen={specimen} open={index === 0} labels={drawerLabels} />
              </SectionReveal>
            ))}
          </div>

          <SectionReveal className="mt-10">
            <p className="type-caption">{t('kitRest')}</p>
            {/*
              A set list, not a fan of pills that part around the pointer. The
              pills were a nice piece of motion and they were the page reaching
              for personality in the one place it had nothing to say; a printed
              index says it in less space and does not need a mouse.
            */}
            <ul className="mt-4 grid gap-x-10 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((item) => (
                <li
                  key={item}
                  className="flex items-baseline gap-3 border-t border-line py-2 text-sm"
                >
                  <span aria-hidden className="type-runhead">
                    &middot;
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </SectionReveal>
        </section>

        {/* ------------------------------------------------------ plate 03 */}
        <section id="process" className={`${page} pb-24 sm:pb-32`}>
          <PlateHead label={t("plateLabel")} number="03" title={t('howTitle')} note={t('processNote')} />

          <div className="mt-10 grid gap-x-16 gap-y-12 lg:grid-cols-[1fr_minmax(0,26rem)] lg:items-start">
            {/*
              The steps as a set sequence: a folio number in the margin, a rule
              between entries, and the text on a book measure. What this replaces
              was a vertical rail with five discs on it, correct about the order
              and wrong about the medium, since a rail with nodes is a diagram of
              a process and a numbered list is the process written down.
            */}
            <ol className="border-t border-line-strong">
              {steps.map((step, index) => (
                <li
                  key={step.name}
                  className="grid grid-cols-[3rem_1fr] gap-x-6 border-b border-line py-7"
                >
                  <span className="type-runhead pt-1.5 tabular-nums">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="type-plate-sm">{step.name}</p>
                    <p className="mt-2 max-w-[54ch] leading-[1.7] text-fg-secondary">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            {/*
              The brief, as a plate with a caption under it.

              Two captures, not one. The page's whole argument is that this
              product writes Arabic natively, and a screenshot of an English
              wizard sitting inside the Arabic edition of the book was the
              loudest possible contradiction of it: the reader is looking at the
              product speaking their language everywhere except in the picture
              of the product. The Arabic capture is the same step of the same
              wizard, mirrored, with the name typed in Arabic.

              The violet chrome stays, and it is not a defect. That is what the
              app behind the login actually looks like (`:root` is still the
              dark navy world, and only the marketing pages moved to paper), so a
              recolour here would be a photograph of a product that does not
              exist. The plate frames it as what it is: a screen, printed.
            */}
            <SectionReveal delay={0.1} className="lg:sticky lg:top-24">
              <figure>
                <div className="plate overflow-hidden bg-elevated p-2">
                  <Image
                    src={locale === 'ar' ? '/marketing/run-brief-ar.webp' : '/marketing/run-brief.webp'}
                    alt={t('howShot')}
                    /* The capture's own pixel dimensions. `w-full` with no height
                       class takes its aspect from these, so a stale pair here
                       stretches the screenshot rather than failing loudly. Both
                       locales are captured from the same clip, so one pair
                       serves both. */
                    width={1488}
                    height={648}
                    className="w-full rounded-[0.0625rem]"
                    sizes="(max-width: 1024px) 100vw, 420px"
                  />
                </div>
                <figcaption className="type-caption mt-3 max-w-[46ch]">{t('howShot')}</figcaption>
              </figure>
            </SectionReveal>
          </div>
        </section>

        {/* ------------------------------------------------------ plate 04 */}
        <section id="terms" className={`${page} pb-24 sm:pb-32`}>
          <PlateHead label={t("plateLabel")} number="04" title={t('pricingHeading')} note={t('pricingDeck')} />

          <SectionReveal className="mt-10">
            <TermsTable locale={locale} />
          </SectionReveal>
        </section>

        {/* --------------------------------------------------------- notes */}
        {/*
          The questions, printed open.

          They were nine identical collapsed bars, a wall of grey rectangles
          that answered nothing until pressed nine times, and the single most
          template-looking block on the page after the pricing grid. Someone
          deciding whether to pay wants to read the answers, not to operate a
          list. Two columns of set notes fit all nine in less height than the
          closed accordion occupied, and the browser's own page search finds
          them.
        */}
        <section className={`${page} pb-24 sm:pb-32`}>
          <PlateHead label={t("plateLabel")} number="05" title={tp('faqTitle')} note={t('notesNote')} />

          <SectionReveal>
            <dl className="mt-10 columns-1 gap-x-16 lg:columns-2">
              {notes.map((note) => (
                <div key={note.q} className="mb-7 break-inside-avoid border-t border-line pt-4">
                  <dt className="font-semibold">{note.q}</dt>
                  <dd className="mt-1.5 text-sm leading-[1.75] text-fg-secondary">{note.a}</dd>
                </div>
              ))}
            </dl>
          </SectionReveal>
        </section>

        {/* ------------------------------------------------------- colophon */}
        {/*
          A colophon: the note at the back of a book saying what it was set in
          and who made it. It is the honest ending for this page and it replaces
          a centred display headline over a fifth copy of the same button,
          which asked, one more time, for the press a reader had already declined
          four times on the way down.
        */}
        {/* The rule sits inside the margins, not on the section box. On the
            section it spanned the full 78rem while every other rule on the page
            stops at the text edge, so the one closing the book was the only one
            that did not line up with the rest. */}
        <section className={`${page} pb-24 pt-16 sm:pb-32`}>
          <div className="grid gap-12 border-t border-line-strong pt-16 lg:grid-cols-[1fr_minmax(0,24rem)]">
            <div>
              <h2 className="type-plate-sm max-w-[20ch]">
                {t('closeTitle')}{' '}
                <span className="text-fg-secondary">{t('closeTitleAccent')}</span>
              </h2>
              <Link href="/register" className="stamp mt-8">
                {t('ctaPrimary')}
              </Link>
            </div>

            <dl className="type-caption self-end">
              <div className="flex justify-between gap-6 border-t border-line py-2">
                <dt>{t('colophonSet')}</dt>
                <dd className="text-fg" dir="ltr">
                  Fraunces &middot; Amiri &middot; Plus Jakarta Sans
                </dd>
              </div>
              {/* The brands, by name. This row carried the whole `stageWall`
                  sentence, which is a caption, not a colophon entry: a colophon
                  lists what a thing is made of in as few words as it takes. */}
              <div className="flex justify-between gap-6 border-t border-line py-2">
                <dt>{t('colophonPlates')}</dt>
                <dd className="text-fg">{specimens.map((s) => s.name).join(', ')}</dd>
              </div>
              <div className="flex justify-between gap-6 border-t border-line py-2">
                <dt>{t('poweredBy')}</dt>
                <dd>
                  <a
                    href="https://enigmitic.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-fg underline decoration-line underline-offset-4 transition-colors hover:decoration-current"
                  >
                    Enigmitic
                  </a>
                </dd>
              </div>
            </dl>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className={`${page} flex flex-wrap items-center justify-between gap-x-10 gap-y-4 py-6`}>
          <span className="flex items-center gap-2.5">
            <LogoMark className="size-6" />
            <span className="type-runhead !text-fg">Brandora</span>
          </span>

          <nav aria-label={t('navKit')} className="flex flex-wrap gap-x-8 gap-y-2">
            <a href="#specimens" className="type-runhead transition-colors hover:!text-fg">
              {t('navKit')}
            </a>
            <a href="#terms" className="type-runhead transition-colors hover:!text-fg">
              {t('navPricing')}
            </a>
            <Link href="/pricing" className="type-runhead transition-colors hover:!text-fg">
              {t('pricingCompare')}
            </Link>
            <Link href="/login" className="type-runhead transition-colors hover:!text-fg">
              {tn('signIn')}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}

/**
 * The head of a plate: its number, its title, and one line of caption.
 *
 * Declared here rather than in `components/` because it is this document's
 * furniture and has exactly one document. A shared component for a thing with
 * one caller is how the utility this page just deleted came to exist.
 */
function PlateHead({
  number,
  title,
  note,
  label,
}: {
  number: string
  title: string
  note: string
  label: string
}) {
  return (
    <SectionReveal>
      <div className="flex items-baseline justify-between gap-6 border-b border-line-strong pb-3">
        <span className="type-runhead tabular-nums">
          {label} {number}
        </span>
        <span className="type-runhead">Brandora</span>
      </div>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-x-12 gap-y-3">
        <h2 className="type-plate-sm max-w-[18ch]">{title}</h2>
        <p className="type-caption max-w-[42ch]">{note}</p>
      </div>
    </SectionReveal>
  )
}
