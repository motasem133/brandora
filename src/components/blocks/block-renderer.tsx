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
/**
 * The rhythm every block sits in.
 *
 * One shell rather than `px-8 py-16` repeated at six call sites with three
 * different values between them, which is what a site with no design system
 * looks like from the inside. The `band` argument alternates the ground so a
 * page reads as sections rather than as one scroll of paper — the cheapest
 * "designed" signal there is, and the only one available to a site with no
 * photography at all.
 */
/**
 * The button, which was a `<span>` on every published site ever generated.
 *
 * No `href` existed in the schema, so the primary conversion element on every
 * page could not be clicked — the customer's site asked a visitor to act and
 * gave them nothing to press. It defaults to the contact page rather than
 * waiting for the schema: every generated site has one, and a button that goes
 * somewhere sensible beats a button that goes nowhere.
 */
function Action({
  label,
  href,
  theme,
  onDark = false,
}: {
  label: string
  /** Not in the schema yet — see the plan's Stage 4. Defaults to contact. */
  href?: string
  theme: SiteTheme
  /** On a photograph, where the brand's primary is already the scrim. */
  onDark?: boolean
}) {
  return (
    <a
      href={href || '?page=contact'}
      className="mt-9 inline-block px-7 py-3.5 text-sm font-medium no-underline"
      style={{
        backgroundColor: onDark ? theme.safe.onPrimary : theme.safe.primary,
        color: onDark ? theme.safe.primary : theme.safe.onPrimary,
        fontFamily: `'${theme.fontBody}', sans-serif`,
        borderRadius: 'var(--site-radius)',
      }}
    >
      {label}
    </a>
  )
}

function Section({
  children,
  theme,
  band = false,
  wide = false,
}: {
  children: React.ReactNode
  theme: SiteTheme
  band?: boolean
  wide?: boolean
}) {
  return (
    <section
      style={{
        paddingBlock: 'var(--site-section)',
        paddingInline: 'var(--site-gutter)',
        /* A tint of the brand's own primary, never a grey. Unchecked on
           purpose and safe by construction: it is a ground, never a text
           colour — the same rule `checkedSiteColors.line` already follows. */
        backgroundColor: band
          ? `color-mix(in srgb, ${theme.safe.primary} 5%, ${theme.safe.paper})`
          : undefined,
      }}
    >
      <div style={{ maxWidth: wide ? 'var(--site-container)' : 'var(--site-measure)', marginInline: 'auto' }}>
        {children}
      </div>
    </section>
  )
}

/**
 * The images a published site may show, resolved by kind.
 *
 * Blocks do not store image ids. A site generated months before its owner buys
 * a kit has no photography to point at, and pointing at it later would mean
 * rewriting stored blocks. Resolving here means the day the kit lands, the live
 * site becomes image-led on the next cache purge — no regeneration, no edit, no
 * credits.
 */
export type SiteImages = {
  scenes: Partial<Record<'hero' | 'people' | 'detail', string>>
  logo?: string
}

/**
 * Served through the public route, which authorises by the published join.
 *
 * A plain `<img>` rather than `next/image`, which lint will mention: the URL
 * behind this one is a signed R2 link that expires in five minutes, so the
 * optimizer would cache an address rather than an image, and the pages using it
 * are served from customer-owned domains the optimizer is not configured for.
 */
const imageUrl = (id: string) => `/api/site-image/${id}`

export function BlockRenderer({
  block,
  theme,
  index = 0,
  images,
  preview = false,
  contact,
}: {
  block: Block
  theme: SiteTheme
  /** Where it sits on the page, so grounds can alternate. */
  index?: number
  images?: SiteImages
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


  switch (block.type) {
    case 'hero': {
      const photo = images?.scenes.hero

      /*
       * With a photograph the hero is the photograph: full bleed, a scrim, the
       * words on it. Without one it is type and space, which is not a fallback
       * so much as the other half of the design — most sites will never have a
       * kit, and a hero with a hole where a picture should be is worse than a
       * hero that never promised one.
       */
      if (photo) {
        return (
          <section className="relative" style={{ minHeight: 'min(78vh, 44rem)' }}>
            <img
              src={imageUrl(photo)}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to top, ${theme.safe.primary}e6 0%, ${theme.safe.primary}66 45%, ${theme.safe.primary}1a 100%)`,
              }}
            />
            <div
              className="relative flex min-h-[inherit] flex-col justify-end"
              style={{
                paddingBlock: 'var(--site-section)',
                paddingInline: 'var(--site-gutter)',
                minHeight: 'min(78vh, 44rem)',
              }}
            >
              <div style={{ maxWidth: 'var(--site-container)', marginInline: 'auto', width: '100%' }}>
                <HeroHeading
                  className="font-bold leading-[1.05] tracking-[-0.02em]"
                  style={{
                    ...heading,
                    color: theme.safe.onPrimary,
                    fontSize: 'var(--site-h1)',
                    maxWidth: '18ch',
                  }}
                >
                  {block.title}
                </HeroHeading>
                {block.subtitle && (
                  <p
                    className="mt-6"
                    style={{
                      ...body,
                      color: theme.safe.onPrimary,
                      opacity: 0.92,
                      fontSize: 'var(--site-lead)',
                      maxWidth: '46ch',
                    }}
                  >
                    {block.subtitle}
                  </p>
                )}
                {block.cta && <Action label={block.cta} theme={theme} onDark />}
              </div>
            </div>
          </section>
        )
      }

      return (
        <Section theme={theme} wide>
          <HeroHeading
            className="font-bold leading-[1.05] tracking-[-0.02em]"
            style={{ ...heading, fontSize: 'var(--site-h1)', maxWidth: '18ch' }}
          >
            {block.title}
          </HeroHeading>
          {block.subtitle && (
            <p
              className="mt-6"
              style={{ ...muted, fontSize: 'var(--site-lead)', maxWidth: '46ch', lineHeight: 1.5 }}
            >
              {block.subtitle}
            </p>
          )}
          {block.cta && <Action label={block.cta} theme={theme} />}
        </Section>
      )
    }

    case 'features':
      return (
        <Section theme={theme} band={index % 2 === 1} wide>
          <h2 className="font-bold" style={{ ...heading, fontSize: 'var(--site-h2)' }}>
            {block.heading}
          </h2>
          {/* The schema allows one to four items and the grid was hardwired to
              three, so four wrapped 3+1 and two sat lopsided. */}
          <div
            className="mt-10 grid"
            style={{
              gap: 'var(--site-gap)',
              /* `auto-fit` rather than a count, so the grid needs no breakpoint
                 and cannot hold two columns at 390px — which is what a fixed
                 count did, wrapping a card's body to two words a line. The
                 `min()` is what stops it overflowing a narrow phone. */
              gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, 15rem), 1fr))`,
            }}
          >
            {block.items.map((item, index) => (
              <div key={index}>
                <div
                  className="mb-4 h-1 w-10"
                  style={{ backgroundColor: theme.secondaryColor }}
                />
                <h3 className="font-semibold" style={{ ...heading, fontSize: 'var(--site-h3)' }}>
                  {item.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed" style={muted}>
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )

    case 'richText': {
      const portrait = images?.scenes.people

      const prose = (
        <div>
          <h2 className="font-bold" style={{ ...heading, fontSize: 'var(--site-h2)' }}>
            {block.heading}
          </h2>
          <div
            className="mt-6 space-y-5"
            style={{ ...muted, fontSize: 'var(--site-body)', lineHeight: 1.7 }}
          >
            {block.body
              .split('\n')
              .filter(Boolean)
              .map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
          </div>
        </div>
      )

      /* The people photograph belongs against the words about the people — the
         About page's story block — and `auto-fit` is what makes it stack on a
         phone without a second breakpoint. */
      if (!portrait) {
        return (
          <Section theme={theme} band={index % 2 === 1}>
            {prose}
          </Section>
        )
      }

      return (
        <Section theme={theme} band={index % 2 === 1} wide>
          <div
            className="grid items-center"
            style={{
              gap: 'clamp(2rem, 5vw, 4rem)',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 22rem), 1fr))',
            }}
          >
            {prose}
            <img
              src={imageUrl(portrait)}
              alt=""
              className="w-full object-cover"
              style={{ aspectRatio: '4 / 5', borderRadius: 'var(--site-radius)' }}
            />
          </div>
        </Section>
      )
    }

    case 'services':
      return (
        <Section theme={theme} band={index % 2 === 1} wide>
          {/* The detail shot as a band above the list — the one place a close-up
              of the work says more than any of the cards under it. */}
          {images?.scenes.detail && (
            <img
              src={imageUrl(images.scenes.detail)}
              alt=""
              className="mb-12 w-full object-cover"
              style={{ aspectRatio: '21 / 9', borderRadius: 'var(--site-radius)' }}
            />
          )}
          <h2 className="font-bold" style={{ ...heading, fontSize: 'var(--site-h2)' }}>
            {block.heading}
          </h2>
          <div
            className="mt-10 grid"
            style={{
              gap: 'var(--site-gap)',
              gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, 20rem), 1fr))`,
            }}
          >
            {block.services.map((service, index) => (
              <div
                key={index}
                className="p-7"
                style={{ border: `1px solid ${theme.safe.line}`, borderRadius: 'var(--site-radius)' }}
              >
                <h3 className="font-semibold" style={{ ...heading, fontSize: 'var(--site-h3)' }}>
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
        </Section>
      )

    case 'cta':
      return (
        /*
         * The full width of the brand's own colour, rather than a tinted card
         * floating in the middle of a white page. A call to action is the one
         * block that should interrupt.
         *
         * `${theme.primaryColor}12` was the old tint — string concatenation
         * assuming a six-digit hex, which produced an invalid colour and a
         * silently untinted panel for any brand whose palette came back in
         * three digits. It was also the one colour path that skipped
         * `checkedSiteColors`.
         */
        <section
          style={{
            paddingBlock: 'var(--site-section)',
            paddingInline: 'var(--site-gutter)',
            backgroundColor: theme.safe.primary,
          }}
        >
          <div style={{ maxWidth: 'var(--site-measure)', marginInline: 'auto' }}>
            <h2
              className="font-bold"
              style={{ ...heading, color: theme.safe.onPrimary, fontSize: 'var(--site-h2)' }}
            >
              {block.heading}
            </h2>
            {block.body && (
              <p
                className="mt-4"
                style={{
                  ...body,
                  color: theme.safe.onPrimary,
                  opacity: 0.9,
                  fontSize: 'var(--site-lead)',
                  maxWidth: '46ch',
                }}
              >
                {block.body}
              </p>
            )}
            {block.cta && (
              <a
                href="?page=contact"
                className="mt-9 inline-block px-7 py-3.5 text-sm font-medium no-underline"
                style={{
                  backgroundColor: theme.safe.onPrimary,
                  color: theme.safe.primary,
                  fontFamily: `'${theme.fontBody}', sans-serif`,
                  borderRadius: 'var(--site-radius)',
                }}
              >
                {block.cta}
              </a>
            )}
          </div>
        </section>
      )

    case 'contact':
      return (
        <Section theme={theme}>
          <h2 className="font-bold" style={{ ...heading, fontSize: 'var(--site-h2)' }}>
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
        </Section>
      )
  }
}

/** Renders a whole page, including the Google Fonts the theme references. */
export function PageRenderer({
  blocks,
  theme,
  images,
  contact,
}: {
  blocks: Block[]
  theme: SiteTheme
  images?: SiteImages
  contact?: ContactLabels
}) {
  /*
   * Each photograph is used once on a page.
   *
   * A home page is often three `richText` blocks in a row; handing every one of
   * them the same portrait would print the same picture three times, which is
   * the single most obvious way a generated site announces itself as generated.
   * The first block that can carry a given scene takes it, and the ones after it
   * fall back to the type-and-space design.
   */
  const unused = { ...(images?.scenes ?? {}) }
  const claim = (block: Block): SiteImages | undefined => {
    if (!images) return undefined

    const wants =
      block.type === 'hero' ? 'hero' : block.type === 'richText' ? 'people' : block.type === 'services' ? 'detail' : null

    if (!wants || !unused[wants]) return { ...images, scenes: {} }

    const scene = { [wants]: unused[wants] }
    delete unused[wants]
    return { ...images, scenes: scene }
  }

  return (
    <div style={{ backgroundColor: theme.safe.paper }}>
      {blocks.map((block, index) => (
        <BlockRenderer
          key={index}
          block={block}
          index={index}
          theme={theme}
          images={claim(block)}
          contact={contact}
        />
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
