import { checkedSiteColors, type CheckedSiteColors } from '@/lib/brand-theme'
import type { Block, Theme } from '@/lib/blocks'

/**
 * The single renderer for website content.
 *
 * Used by both the builder canvas and the published site, so what a user
 * arranges is literally what gets served — the preview cannot drift from
 * production because there is only one implementation.
 *
 * Styling is inline rather than Tailwind classes because the values come from
 * the customer's own generated palette and fonts, which are unknown at build
 * time and therefore cannot be expressed as static utilities.
 */

const FALLBACK: Required<Theme> = {
  primaryColor: '#7c3aed',
  secondaryColor: '#06b6d4',
  backgroundColor: '#ffffff',
  textColor: '#111827',
  fontHeading: 'Syne',
  fontBody: 'Inter',
}

/**
 * The theme as configured, plus the colours that are safe to put text on.
 *
 * A generated palette is not a designed one — it can pair near-black text with
 * a near-black ground, or hand back a primary nobody can read a label on — and
 * this renderer used every value raw. The checked set comes from the same
 * arithmetic the in-app brand surfaces have always used.
 */
export type SiteTheme = Required<Theme> & { safe: CheckedSiteColors }

export function resolveTheme(theme?: Theme): SiteTheme {
  const merged = {
    ...FALLBACK,
    ...Object.fromEntries(Object.entries(theme ?? {}).filter(([, v]) => v)),
  } as Required<Theme>

  return {
    ...merged,
    safe: checkedSiteColors({
      background: merged.backgroundColor,
      text: merged.textColor,
      primary: merged.primaryColor,
    }),
  }
}

export function BlockRenderer({ block, theme }: { block: Block; theme: SiteTheme }) {
  const heading = { fontFamily: `'${theme.fontHeading}', sans-serif`, color: theme.safe.ink }
  const body = { fontFamily: `'${theme.fontBody}', sans-serif`, color: theme.safe.ink }
  /* The ink softened only as far as it can go and still be read, rather than a
     flat opacity that cannot reach the floor for any pair of colours. */
  const muted = { ...body, color: theme.safe.muted }
  /* The primary when it can carry text on this ground, deepened when it cannot —
     for a price, an email address, anything set in the brand's own colour. */
  const accent = { ...body, color: theme.safe.accent }

  const button = {
    backgroundColor: theme.safe.primary,
    color: theme.safe.onPrimary,
    fontFamily: `'${theme.fontBody}', sans-serif`,
  }

  switch (block.type) {
    case 'hero':
      return (
        <section className="px-8 py-20 text-center sm:py-28">
          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-5xl" style={heading}>
            {block.title}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg" style={muted}>
            {block.subtitle}
          </p>
          <span
            className="mt-8 inline-block rounded-lg px-6 py-3 text-sm font-medium"
            style={button}
          >
            {block.cta}
          </span>
        </section>
      )

    case 'features':
      return (
        <section className="px-8 py-16">
          <h2 className="text-center text-2xl font-bold sm:text-3xl" style={heading}>
            {block.heading}
          </h2>
          <div className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-3">
            {block.items.map((item, index) => (
              <div key={index} className="text-center">
                <div
                  className="mx-auto mb-4 h-1 w-10 rounded-full"
                  style={{ backgroundColor: theme.secondaryColor }}
                />
                <h3 className="text-lg font-semibold" style={heading}>
                  {item.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed" style={muted}>
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      )

    case 'richText':
      return (
        <section className="px-8 py-16">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-2xl font-bold sm:text-3xl" style={heading}>
              {block.heading}
            </h2>
            <div className="mt-4 space-y-4 leading-relaxed" style={muted}>
              {block.body
                .split('\n')
                .filter(Boolean)
                .map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
            </div>
          </div>
        </section>
      )

    case 'services':
      return (
        <section className="px-8 py-16">
          <h2 className="text-center text-2xl font-bold sm:text-3xl" style={heading}>
            {block.heading}
          </h2>
          <div className="mx-auto mt-10 grid max-w-4xl gap-5 sm:grid-cols-2">
            {block.services.map((service, index) => (
              <div
                key={index}
                className="rounded-xl p-6"
                style={{ border: `1px solid ${theme.safe.line}` }}
              >
                <h3 className="text-lg font-semibold" style={heading}>
                  {service.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed" style={muted}>
                  {service.body}
                </p>
                {service.price && (
                  <p className="mt-3 font-semibold" style={accent}>
                    {service.price}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )

    case 'cta':
      return (
        <section className="px-8 py-16">
          <div
            className="mx-auto max-w-3xl rounded-2xl px-8 py-14 text-center"
            style={{ backgroundColor: `${theme.primaryColor}12` }}
          >
            <h2 className="text-2xl font-bold sm:text-3xl" style={heading}>
              {block.heading}
            </h2>
            <p className="mx-auto mt-3 max-w-lg" style={muted}>
              {block.body}
            </p>
            <span className="mt-7 inline-block rounded-lg px-6 py-3 text-sm font-medium" style={button}>
              {block.cta}
            </span>
          </div>
        </section>
      )

    case 'contact':
      return (
        <section className="px-8 py-16 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl" style={heading}>
            {block.heading}
          </h2>
          <p className="mx-auto mt-3 max-w-lg" style={muted}>
            {block.body}
          </p>
          <p className="mt-6 text-lg font-medium" style={accent}>
            {block.email}
          </p>
          {block.phone && (
            <p className="mt-1 text-sm" style={muted}>
              {block.phone}
            </p>
          )}
        </section>
      )
  }
}

/** Renders a whole page, including the Google Fonts the theme references. */
export function PageRenderer({
  blocks,
  theme,
}: {
  blocks: Block[]
  theme: SiteTheme
}) {
  return (
    <div style={{ backgroundColor: theme.safe.paper }}>
      {blocks.map((block, index) => (
        <BlockRenderer key={index} block={block} theme={theme} />
      ))}
    </div>
  )
}

/** Google Fonts URL for the theme's families, or null if they are defaults. */
export function fontHref(theme: Required<Theme>) {
  const families = [theme.fontHeading, theme.fontBody]
    .filter(Boolean)
    .map((family) => `family=${family.replace(/\s+/g, '+')}:wght@400;500;600;700`)
    .join('&')

  return families ? `https://fonts.googleapis.com/css2?${families}&display=swap` : null
}
