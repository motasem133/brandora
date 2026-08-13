import { SITE_REGISTERS, type SiteTheme } from './block-renderer'
import type { PageKey } from '@/lib/blocks'
import type { RegisterName } from '@/lib/register'

/**
 * The header and footer of a customer's site.
 *
 * Extracted from the published page rather than copied into the builder, for
 * the reason written at the top of `block-renderer.tsx`: there is one
 * implementation, so what a customer arranges is literally what gets served.
 * The builder's canvas showed the blocks and nothing around them — no logo, no
 * nav, no footer — which is the part of a website a person looks at first.
 *
 * `preview` is the only difference between the two, and it is the same
 * distinction `Action` already makes: in the canvas the nav is a picture of a
 * nav. Live links there would take a customer out of the editor with unsaved
 * work in it, and a second `<nav>` landmark would compete with the builder's
 * own page tabs for a screen reader.
 */

/**
 * What each page is called, in the two languages a brand can be generated in.
 *
 * Not `next-intl`. A published site sits outside the `[locale]` segment and has
 * no translation context — and should not have one: the language belongs to the
 * brand, not to the browser visiting it. A customer in Dubai whose site is in
 * Arabic must not get an English nav because the visitor's laptop is English.
 */
export const TITLES = {
  en: {
    home: 'Home',
    about: 'About',
    services: 'Services',
    menu: 'Menu',
    pricing: 'Pricing',
    faq: 'FAQ',
    contact: 'Contact',
  },
  ar: {
    home: 'الرئيسية',
    about: 'من نحن',
    services: 'خدماتنا',
    menu: 'القائمة',
    pricing: 'الأسعار',
    faq: 'أسئلة شائعة',
    contact: 'اتصل بنا',
  },
} as const satisfies Record<string, Record<PageKey, string>>

export function SiteHeader({
  name,
  logoUrl,
  nav,
  active,
  titles,
  theme,
  register,
  base = '',
  language,
  preview = false,
}: {
  name: string
  logoUrl?: string
  /** The pages that have something on them — the same rule the site follows. */
  nav: readonly PageKey[]
  active: PageKey
  /** What the customer calls each page, when they have said. */
  titles?: Record<string, string>
  theme: SiteTheme
  register: RegisterName
  base?: string
  language: 'en' | 'ar'
  preview?: boolean
}) {
  const Item = preview ? 'span' : 'a'
  /* The button only appears at `sm` and up, so the nav keeps its Contact link
     below that width — filtering it out entirely left a phone with no way to
     reach the page at all. Neither is ever visible at the same time as the
     other. */
  const act = nav.includes('contact')

  return (
    <header
      className="flex flex-wrap items-center justify-between gap-4 px-8 py-5"
      style={{ borderBottom: `1px solid ${theme.safe.line}` }}
    >
      {/* The logo when there is one, the name when there is not — never both,
          and never a name-shaped gap while an image loads. */}
      {logoUrl ? (
        <img src={logoUrl} alt={name} className="w-auto" style={{ height: 'clamp(1.75rem, 3vw, 2.5rem)' }} />
      ) : (
        <span
          className="text-lg font-bold"
          /* The brand's own colour when it can be read on the brand's own
             ground, deepened when it cannot — this is the site's name. */
          style={{ fontFamily: `'${theme.fontHeading}', sans-serif`, color: theme.safe.accent }}
        >
          {name}
        </span>
      )}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {/* A `<div>` in the canvas: a second navigation landmark would compete
            with the builder's page tabs, which are the nav that actually works
            there. */}
        {/* Contact leaves the list when it is the button beside it — the same
            word twice, two inches apart, is not a navigation. */}
        {preview ? (
          <div className="flex gap-5">{nav.map((key) => item(key))}</div>
        ) : (
          <nav aria-label={TITLES[language].home} className="flex gap-5">
            {nav.map((key) => item(key))}
          </nav>
        )}

        {/*
          The act, in the corner every visitor looks in.
          
          A small business's site has one thing it wants from a stranger, and
          the header is where a stranger looks for it — it carried a logo and
          four words and nothing to press. Only when the site has somewhere to
          send them.
        */}
        {act && (
          <Item
            {...(preview ? {} : { href: `${base}/contact` })}
            className="hidden px-4 py-2 text-sm font-medium no-underline sm:inline-block"
            style={{
              backgroundColor: theme.safe.primary,
              color: theme.safe.onPrimary,
              borderRadius: 'var(--site-radius)',
              fontFamily: `'${theme.fontBody}', sans-serif`,
            }}
          >
            {titles?.contact?.trim() || TITLES[language].contact}
          </Item>
        )}
      </div>
    </header>
  )

  function item(key: PageKey) {
    return (
      <Item
        key={key}
        {...(preview ? {} : { href: key === 'home' ? `${base}/` : `${base}/${key}` })}
        aria-current={!preview && key === active ? 'page' : undefined}
        className={`text-sm${preview ? '' : ' hover:underline'}${
          SITE_REGISTERS[register].formal ? ' uppercase tracking-[0.14em]' : ''
        }${key === 'contact' && act ? ' sm:hidden' : ''}`}
        /* The inactive state is a checked softer ink rather than an opacity
           multiplier, which cannot reach the contrast floor. */
        style={{
          fontFamily: `'${theme.fontBody}', sans-serif`,
          color: key === active ? theme.safe.ink : theme.safe.muted,
        }}
      >
        {titles?.[key]?.trim() || TITLES[language][key]}
      </Item>
    )
  }
}

/**
 * The end of the page, rather than a line of small print.
 *
 * It was one sentence: a copyright and a year. A visitor who has read to the
 * bottom is the most interested person on the site, and they were handed
 * nothing to do — so the pages come with them, and the name is set in the
 * brand's own face at the size the brand deserves.
 */
export function SiteFooter({
  name,
  nav,
  titles,
  theme,
  base = '',
  language,
  year,
  preview = false,
}: {
  name: string
  nav?: readonly PageKey[]
  titles?: Record<string, string>
  theme: SiteTheme
  base?: string
  language: 'en' | 'ar'
  year: number
  preview?: boolean
}) {
  const Item = preview ? 'span' : 'a'

  return (
    <footer
      className="px-8 py-12"
      style={{
        fontFamily: `'${theme.fontBody}', sans-serif`,
        color: theme.safe.muted,
        borderTop: `1px solid ${theme.safe.line}`,
      }}
    >
      <div
        className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6"
        style={{ maxWidth: 'var(--site-container)', marginInline: 'auto' }}
      >
        <p
          className="text-lg font-bold"
          style={{ fontFamily: `'${theme.fontHeading}', sans-serif`, color: theme.safe.ink }}
        >
          {name}
        </p>

        {nav && nav.length > 1 && (
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {nav.map((key) => (
              <Item
                key={key}
                {...(preview ? {} : { href: key === 'home' ? `${base}/` : `${base}/${key}` })}
                className={`text-sm${preview ? '' : ' hover:underline'}`}
                style={{ color: theme.safe.muted }}
              >
                {titles?.[key]?.trim() || TITLES[language][key]}
              </Item>
            ))}
          </div>
        )}

        <p className="text-sm">© {year} {name}</p>
      </div>
    </footer>
  )
}
