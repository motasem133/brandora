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
  theme: SiteTheme
  register: RegisterName
  base?: string
  language: 'en' | 'ar'
  preview?: boolean
}) {
  const Item = preview ? 'span' : 'a'

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

      {/* A `<div>` in the canvas: a second navigation landmark would compete
          with the builder's page tabs, which are the nav that actually works
          there. */}
      {preview ? (
        <div className="flex gap-5">{nav.map((key) => item(key))}</div>
      ) : (
        <nav aria-label={TITLES[language].home} className="flex gap-5">
          {nav.map((key) => item(key))}
        </nav>
      )}
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
        }`}
        /* The inactive state is a checked softer ink rather than an opacity
           multiplier, which cannot reach the contrast floor. */
        style={{
          fontFamily: `'${theme.fontBody}', sans-serif`,
          color: key === active ? theme.safe.ink : theme.safe.muted,
        }}
      >
        {TITLES[language][key]}
      </Item>
    )
  }
}

export function SiteFooter({ name, theme, year }: { name: string; theme: SiteTheme; year: number }) {
  return (
    <footer
      className="px-8 py-10 text-center text-sm"
      style={{
        fontFamily: `'${theme.fontBody}', sans-serif`,
        color: theme.safe.muted,
        borderTop: `1px solid ${theme.safe.line}`,
      }}
    >
      © {year} {name}
    </footer>
  )
}
