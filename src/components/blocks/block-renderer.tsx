import { checkedSiteColors, type CheckedSiteColors } from '@/lib/brand-theme'
import type { Block, Theme } from '@/lib/blocks'
import { ContactForm } from './contact-form'

/**
 * The words the contact form is built from.
 *
 * Passed in rather than read from `next-intl` here: this renderer serves a
 * customer's own site, which has no locale segment and no app translation
 * context — and the language it should speak is the brand's, not the visiting
 * browser's.
 */
export type ContactLabels = {
  name: string
  email: string
  message: string
  send: string
  sending: string
  sent: string
  failed: string
}

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

/**
 * One block of a customer's site.
 *
 * `preview` is what tells the hero whether it is the top of its own document or
 * a picture of one. Published, the hero's title is the page's `h1` and should
 * be. Inside the builder it is a document within a document: the canvas already
 * sits under the builder's own `h1`, so a second one there gives the editing
 * page two competing top-level headings — which is what a screen reader hears
 * and what made "the h1" ambiguous enough to fail a test.
 *
 * The tag changes; nothing about the look does. A visitor to the published site
 * sees exactly what the customer arranged, and so does the customer.
 */
export function BlockRenderer({
  block,
  theme,
  preview = false,
  contact,
}: {
  block: Block
  theme: SiteTheme
  preview?: boolean
  /** Absent in the builder, where the block is a picture of itself. */
  contact?: ContactLabels
}) {
  const HeroHeading = preview ? 'p' : 'h1'
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
          <HeroHeading
            className="mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-5xl"
            style={heading}
          >
            {block.title}
          </HeroHeading>
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

          {/*
            The form, on the published site only.

            In the builder this block is a picture of itself — a canvas the
            customer drags and edits — and a live form there would post a real
            enquiry from someone editing their own page. The address and the
            phone number stay above it either way: some visitors would rather
            ring, and a form is an addition to the ways to reach a business,
            not a replacement for them.
          */}
          {!preview && contact && (
            <ContactForm colors={theme.safe} labels={contact} font={theme.fontBody} />
          )}
        </section>
      )
  }
}

/** Renders a whole page, including the Google Fonts the theme references. */
export function PageRenderer({
  blocks,
  theme,
  contact,
}: {
  blocks: Block[]
  theme: SiteTheme
  contact?: ContactLabels
}) {
  return (
    <div style={{ backgroundColor: theme.safe.paper }}>
      {blocks.map((block, index) => (
        <BlockRenderer key={index} block={block} theme={theme} contact={contact} />
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
