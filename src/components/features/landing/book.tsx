import { getTranslations } from 'next-intl/server'

import { SectionReveal } from '@/components/ui/horizon'
import { LogoMark } from '@/components/ui/logo'
import { Link } from '@/i18n/navigation'

/**
 * The book's furniture, shared by the two documents that are set as one.
 *
 * The running head, the plate head and the foot lived inside the landing page,
 * with a comment saying a shared component for a thing with one caller is how
 * dead abstractions start. That was right while there was one document. There
 * are now two: the book, and its appendix at `/pricing`, which carries the full
 * comparison and the credit packs because a terms page should not. Two copies
 * of a running head is how the two pages drift into looking like two products,
 * which is the exact failure `/pricing` was already in before this pass.
 *
 * The plate numbers run straight through: the book is 01 to 05 and the appendix
 * picks up at 06. It is one publication, paginated once.
 */

/** In-page anchors work on the cover; from the appendix they need the path. */
type Where = 'cover' | 'appendix'

function anchors(where: Where, locale: string) {
  return where === 'cover' ? '' : `/${locale}`
}

/**
 * The running head, which is what a book has instead of a navigation bar.
 *
 * The same links, set as apparatus: the title of the book on one side, where
 * you are in it on the other. Plain anchors rather than router links, because
 * a jump to a heading on the page you are already on is a scroll, not a
 * navigation, and routing it makes the sticky head re-render to go nowhere.
 */
export async function RunningHead({
  where,
  locale,
  page,
}: {
  where: Where
  locale: string
  page: string
}) {
  const t = await getTranslations('Landing')
  const base = anchors(where, locale)

  return (
    /* `bg-base` is deliberately not a registered colour utility, it would
       compile `.text-base` to a colour instead of a font size, so the ground is
       mixed from the token directly. */
    <header className="sticky top-0 z-30 border-b border-line bg-[color-mix(in_srgb,var(--bg-base)_88%,transparent)] backdrop-blur">
      <div className={`${page} flex items-center justify-between gap-6 py-3.5`}>
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark className="size-7" />
          <span className="type-runhead !text-fg">Brandora</span>
        </Link>

        <nav className="hidden items-center gap-9 md:flex">
          <a href={`${base}#specimens`} className="type-runhead transition-colors hover:!text-fg">
            {t('navKit')}
          </a>
          <a href={`${base}#process`} className="type-runhead transition-colors hover:!text-fg">
            {t('navHow')}
          </a>
          <a href={`${base}#terms`} className="type-runhead transition-colors hover:!text-fg">
            {t('navPricing')}
          </a>
        </nav>

        <Link href="/register" className="stamp !px-5 !py-2.5">
          {t('ctaPrimary')}
        </Link>
      </div>
    </header>
  )
}

/** The foot of every page: the mark, and the way to the rest of the book. */
export async function RunningFoot({
  where,
  locale,
  page,
}: {
  where: Where
  locale: string
  page: string
}) {
  const t = await getTranslations('Landing')
  const tn = await getTranslations('Nav')
  const base = anchors(where, locale)

  return (
    <footer className="border-t border-line">
      <div className={`${page} flex flex-wrap items-center justify-between gap-x-10 gap-y-4 py-6`}>
        <span className="flex items-center gap-2.5">
          <LogoMark className="size-6" />
          <span className="type-runhead !text-fg">Brandora</span>
        </span>

        <nav aria-label={t('navKit')} className="flex flex-wrap gap-x-8 gap-y-2">
          <a href={`${base}#specimens`} className="type-runhead transition-colors hover:!text-fg">
            {t('navKit')}
          </a>
          <a href={`${base}#terms`} className="type-runhead transition-colors hover:!text-fg">
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
  )
}

/**
 * The head of a plate: its number, its title, and one line of caption.
 */
export function PlateHead({
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

/**
 * A book's margins are wide and its measure is short. A landing page's are
 * neither, which is most of why one reads as printed and the other does not.
 */
export const BOOK_PAGE = 'mx-auto w-full max-w-[78rem] px-6 sm:px-10 lg:px-16'

/**
 * The reveal is an enhancement; the content is not conditional on it. Without
 * this the elements below the fold stayed at `opacity: 0` for good on a browser
 * with JavaScript off, thousands of pixels of blank ground.
 */
export function RevealFallback() {
  return (
    <noscript>
      <style
        dangerouslySetInnerHTML={{
          __html:
            '[data-reveal]{opacity:1!important;transform:none!important;filter:none!important}',
        }}
      />
    </noscript>
  )
}
