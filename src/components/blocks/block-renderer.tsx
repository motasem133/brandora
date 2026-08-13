import { checkedSiteColors, type CheckedSiteColors } from '@/lib/brand-theme'
import { isBlank, type Block, type Theme } from '@/lib/blocks'
import type { RegisterName } from '@/lib/register'
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
  base = '',
  theme,
  onDark = false,
  preview = false,
}: {
  label: string
  /** The customer's own link when they set one; the contact page when not. */
  href?: string
  /** What this site's own paths are prefixed with — see `basePath`. */
  base?: string
  theme: SiteTheme
  /** On a photograph, where the brand's primary is already the scrim. */
  onDark?: boolean
  /** In the builder the button is a picture of a button, and must not navigate. */
  preview?: boolean
}) {
  const Tag = preview ? 'span' : 'a'

  return (
    <Tag
      href={preview ? undefined : href || `${base}/contact`}
      className="mt-9 inline-block px-7 py-3.5 text-sm font-medium no-underline"
      style={{
        backgroundColor: onDark ? theme.safe.onPrimary : theme.safe.primary,
        color: onDark ? theme.safe.primary : theme.safe.onPrimary,
        fontFamily: `'${theme.fontBody}', sans-serif`,
        borderRadius: 'var(--site-radius)',
      }}
    >
      {label}
    </Tag>
  )
}

function Section({
  children,
  theme,
  band = false,
  wide = false,
  tight = false,
}: {
  children: React.ReactNode
  theme: SiteTheme
  band?: boolean
  wide?: boolean
  /** For a section that is three lines: the full rhythm reads as a mistake. */
  tight?: boolean
}) {
  return (
    <section
      style={{
        paddingBlock: tight ? 'calc(var(--site-section) * 0.62)' : 'var(--site-section)',
        paddingInline: 'var(--site-gutter)',
        /* A tint of the brand's own primary, never a grey. Unchecked on
           purpose and safe by construction: it is a ground, never a text
           colour — the same rule `checkedSiteColors.line` already follows. */
        backgroundColor: band
          ? `color-mix(in srgb, ${theme.safe.primary} var(--site-band, 5%), ${theme.safe.paper})`
          : undefined,
      }}
    >
      {/*
        One left edge down the whole page.
        
        Narrow sections used to be centred at the measure while wide ones filled
        the container, so a visitor scrolling past a hero, an hours table and a
        contact form watched the page's own margin move three times. The column
        is always the container now; text inside it is held to the measure and
        stays where the heading above it started.
      */}
      <div style={{ maxWidth: 'var(--site-container)', marginInline: 'auto' }}>
        <div style={{ maxWidth: wide ? undefined : 'var(--site-measure)' }}>{children}</div>
      </div>
    </section>
  )
}

/**
 * A heading beside its prose, rather than a single column ranged hard left.
 *
 * Every section on every generated site was one column of one measure, pinned
 * to the left of whatever screen it was on — which is what made a page of good
 * copy read as a document somebody had not finished laying out. Wide screens
 * get the heading in its own column; a phone gets what it always got.
 *
 * `lg:` and not a clamp, because this is the one thing a clamp cannot do:
 * change how many columns there are.
 */
function Split({
  aside,
  children,
  centred = false,
}: {
  aside: React.ReactNode
  children: React.ReactNode
  centred?: boolean
}) {
  if (centred) {
    return (
      <div className="mx-auto text-center" style={{ maxWidth: 'var(--site-measure)' }}>
        {aside}
        {children}
      </div>
    )
  }

  return (
    <div
      className="grid gap-x-16 gap-y-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"
      style={{ maxWidth: 'var(--site-container)', marginInline: 'auto' }}
    >
      <div className="lg:sticky lg:top-12 lg:self-start">{aside}</div>
      <div style={{ maxWidth: 'var(--site-measure)' }}>{children}</div>
    </div>
  )
}

/**
 * What a register means on a website.
 *
 * The same four names the kit uses, in CSS lengths rather than 1080-space
 * pixels — see `lib/register.ts` for why the values are not shared. Every one
 * of these is a decision a designer would make about a business before writing
 * a line of copy: how much air it stands in, how loud its headings are, whether
 * its corners are cut square, and whether a photograph stays a photograph or
 * becomes the brand's own two colours.
 *
 * They are applied as custom properties on the site's root, so a block never
 * asks which register it is in — it reads `var(--site-section)` exactly as it
 * did before this existed.
 */
type SiteRegister = {
  /** Multiplier on every type token. */
  scale: number
  /** The vertical rhythm between sections. */
  section: string
  /** Corner radius on cards, buttons and framed pictures. */
  radius: string
  /** How wide the prose runs. Quiet registers hold a narrower measure. */
  measure: string
  /** Where a hero's words range. */
  align: 'start' | 'center'
  /** How much of the brand's primary tints an alternating band, in percent. */
  band: number
  /** Small caps and tracking on the nav — formality, cheaply. */
  formal: boolean
  /** How a photograph is treated. See `photoStyle`. */
  photo: 'plain' | 'duotone' | 'tint'
}

export const SITE_REGISTERS = {
  /** Sharp, ranged left, generous. Technology, corporate, consultancy. */
  editorial: {
    scale: 1,
    section: 'clamp(3.5rem, 8vw, 7rem)',
    radius: '0.125rem',
    measure: '68ch',
    align: 'start',
    band: 5,
    formal: false,
    photo: 'plain',
  },
  /** Big type, colour as field, tight rhythm. Bold, playful, retail, sport. */
  loud: {
    scale: 1.18,
    section: 'clamp(3rem, 6.5vw, 5.5rem)',
    radius: '0.625rem',
    measure: '60ch',
    align: 'start',
    band: 10,
    formal: false,
    photo: 'duotone',
  },
  /** Centred, quiet, a lot of air. Luxury, jewellery, hospitality, Arabic. */
  refined: {
    scale: 0.94,
    section: 'clamp(4.5rem, 11vw, 9rem)',
    radius: '0rem',
    measure: '58ch',
    align: 'center',
    band: 4,
    formal: true,
    photo: 'tint',
  },
  /** Soft edges, warm fields. Food, beauty, wellness, craft. */
  organic: {
    scale: 1,
    section: 'clamp(3.75rem, 8.5vw, 7.5rem)',
    radius: '1.5rem',
    measure: '64ch',
    align: 'start',
    band: 9,
    formal: false,
    photo: 'plain',
  },
} as const satisfies Record<RegisterName, SiteRegister>

/**
 * The custom properties a register sets on the site's root.
 *
 * Returned rather than written, because the same values have to reach both the
 * published page and the builder's canvas — and the canvas has been showing a
 * different design from production for its whole life.
 */
export function registerStyle(name: RegisterName): React.CSSProperties {
  const register = SITE_REGISTERS[name]

  return {
    '--site-scale': String(register.scale),
    /* Multiplied here rather than in the stylesheet: a custom property resolves
       its own `var()`s on the element that declares it, so a scale applied at
       `:root` would be the root's scale — which is 1, for everyone. */
    '--site-h1': `calc(var(--site-h1-raw) * ${register.scale})`,
    '--site-h2': `calc(var(--site-h2-raw) * ${register.scale})`,
    '--site-h3': `calc(var(--site-h3-raw) * ${register.scale})`,
    '--site-section': register.section,
    '--site-radius': register.radius,
    '--site-measure': register.measure,
    '--site-band': `${register.band}%`,
  } as React.CSSProperties
}

/**
 * A photograph in the brand's own colours, or left alone.
 *
 * `luminosity` over a ground of the brand's primary is the whole duotone: the
 * picture keeps its light and shade and takes the brand's hue, which is what
 * makes a generated stock frame read as this brand's photography rather than as
 * a stock frame. No SVG filter, no second request, and it degrades to the plain
 * photograph anywhere `mix-blend-mode` is not understood.
 */
function photoStyle(name: RegisterName, theme: SiteTheme) {
  const treatment = SITE_REGISTERS[name].photo
  if (treatment === 'plain') return { wrap: undefined, image: undefined }

  return {
    wrap: { backgroundColor: theme.safe.primary },
    image: {
      mixBlendMode: 'luminosity' as const,
      opacity: treatment === 'duotone' ? 0.92 : 0.8,
    },
  }
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
  repeated = false,
  images,
  register = 'editorial',
  base = '',
  preview = false,
  contact,
}: {
  block: Block
  theme: SiteTheme
  /** Where it sits on the page, so grounds can alternate. */
  index?: number
  /** The block before this one is the same type — see the `cta` case. */
  repeated?: boolean
  images?: SiteImages
  /** The brand's bearing — see `lib/register.ts`. */
  register?: RegisterName
  /** What this site's own paths are prefixed with — see `basePath`. */
  base?: string
  preview?: boolean
  /** Absent in the builder, where the block is a picture of itself. */
  contact?: ContactLabels
}) {
  // A block with nothing in it is not published. See `isBlank`.
  if (!preview && isBlank(block)) return null

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
      const centred = SITE_REGISTERS[register].align === 'center'

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
            <div className="absolute inset-0" style={photoStyle(register, theme).wrap}>
              <img
                src={imageUrl(photo)}
                alt=""
                className="h-full w-full object-cover"
                style={photoStyle(register, theme).image}
              />
            </div>
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
              <div
                style={{
                  maxWidth: 'var(--site-container)',
                  marginInline: 'auto',
                  width: '100%',
                  textAlign: centred ? 'center' : undefined,
                }}
              >
                <HeroHeading
                  className="font-bold leading-[1.05] tracking-[-0.02em]"
                  style={{
                    ...heading,
                    color: theme.safe.onPrimary,
                    fontSize: 'var(--site-h1)',
                    maxWidth: '18ch',
                    marginInline: centred ? 'auto' : undefined,
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
                      marginInline: centred ? 'auto' : undefined,
                    }}
                  >
                    {block.subtitle}
                  </p>
                )}
                {block.cta && (
                  <Action
                    label={block.cta}
                    href={block.ctaHref}
                    base={base}
                    theme={theme}
                    preview={preview}
                    onDark
                  />
                )}
              </div>
            </div>
          </section>
        )
      }

      return (
        <Section theme={theme} wide>
          <div style={{ textAlign: centred ? 'center' : undefined }}>
            <HeroHeading
              className="font-bold leading-[1.05] tracking-[-0.02em]"
              style={{
                ...heading,
                fontSize: 'var(--site-h1)',
                maxWidth: '18ch',
                marginInline: centred ? 'auto' : undefined,
              }}
            >
              {block.title}
            </HeroHeading>
            {block.subtitle && (
              <p
                className="mt-6"
                style={{
                  ...muted,
                  fontSize: 'var(--site-lead)',
                  maxWidth: '46ch',
                  lineHeight: 1.5,
                  marginInline: centred ? 'auto' : undefined,
                }}
              >
                {block.subtitle}
              </p>
            )}
            {block.cta && (
              <Action label={block.cta} href={block.ctaHref} base={base} theme={theme} preview={preview} />
            )}
          </div>
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
      const centred = SITE_REGISTERS[register].align === 'center'

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
          <Section theme={theme} band={index % 2 === 1} wide>
            <Split
              centred={centred}
              aside={
                <h2 className="font-bold" style={{ ...heading, fontSize: 'var(--site-h2)' }}>
                  {block.heading}
                </h2>
              }
            >
              <div
                className="space-y-5"
                style={{ ...muted, fontSize: 'var(--site-body)', lineHeight: 1.7 }}
              >
                {block.body
                  .split('\n')
                  .filter(Boolean)
                  .map((paragraph, paragraphIndex) => (
                    <p key={paragraphIndex}>{paragraph}</p>
                  ))}
              </div>
            </Split>
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
            <div
              className="overflow-hidden"
              style={{ ...photoStyle(register, theme).wrap, borderRadius: 'var(--site-radius)' }}
            >
              <img
                src={imageUrl(portrait)}
                alt=""
                className="w-full object-cover"
                style={{ aspectRatio: '4 / 5', ...photoStyle(register, theme).image }}
              />
            </div>
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
            <div
              className="mb-12 overflow-hidden"
              style={{ ...photoStyle(register, theme).wrap, borderRadius: 'var(--site-radius)' }}
            >
              <img
                src={imageUrl(images.scenes.detail)}
                alt=""
                className="w-full object-cover"
                style={{ aspectRatio: '21 / 9', ...photoStyle(register, theme).image }}
              />
            </div>
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

    case 'cta': {
      /*
       * The brand's own colour, full width — a call to action is the one block
       * that should interrupt. But only once in a row: a page whose last two
       * sections are both calls to action rendered as nine hundred pixels of
       * unbroken brown with two small buttons adrift in it, which is what one
       * real customer's home page looks like today. The second one is set
       * quietly instead, on the page's own ground.
       *
       * `${theme.primaryColor}12` was the old tint — string concatenation
       * assuming a six-digit hex, which produced an invalid colour and a
       * silently untinted panel for any brand whose palette came back in three
       * digits, and the one colour path that skipped `checkedSiteColors`.
       */
      const loud = !repeated

      return (
        <section
          style={{
            paddingBlock: 'calc(var(--site-section) * 0.72)',
            paddingInline: 'var(--site-gutter)',
            backgroundColor: loud ? theme.safe.primary : undefined,
            borderTop: loud ? undefined : `1px solid ${theme.safe.line}`,
          }}
        >
          <div
            className="flex flex-wrap items-end justify-between gap-x-12 gap-y-6"
            style={{ maxWidth: 'var(--site-container)', marginInline: 'auto' }}
          >
            {/* The words and the act, side by side on a wide screen: a heading
                with a button four hundred pixels below it is not one gesture. */}
            <div style={{ maxWidth: '34ch' }}>
              <h2
                className="font-bold"
                style={{
                  ...heading,
                  color: loud ? theme.safe.onPrimary : theme.safe.ink,
                  fontSize: 'var(--site-h2)',
                }}
              >
                {block.heading}
              </h2>
              {block.body && (
                <p
                  className="mt-4"
                  style={{
                    ...body,
                    color: loud ? theme.safe.onPrimary : theme.safe.muted,
                    opacity: loud ? 0.9 : 1,
                    fontSize: 'var(--site-lead)',
                  }}
                >
                  {block.body}
                </p>
              )}
            </div>
            {block.cta && (
              <div className="shrink-0">
                <Action
                  label={block.cta}
                  href={block.ctaHref}
                  base={base}
                  theme={theme}
                  preview={preview}
                  onDark={loud}
                />
              </div>
            )}
          </div>
        </section>
      )
    }

    case 'quote':
      /* Set as a statement, not as a card. The brand's own primary carries it
         and the mark of quotation is the size, not a decorative glyph. */
      return (
        <Section theme={theme} band={index % 2 === 1}>
          <blockquote>
            <p
              className="font-medium leading-[1.25]"
              style={{ ...heading, color: theme.safe.accent, fontSize: 'var(--site-h2)' }}
            >
              {block.quote}
            </p>
            {block.attribution && (
              <footer className="mt-6 text-sm" style={muted}>
                {block.attribution}
              </footer>
            )}
          </blockquote>
        </Section>
      )

    case 'faq':
      /* Native `<details>`: open/close with no JavaScript, and a visitor's
         browser search finds the answers inside closed ones. */
      return (
        <Section theme={theme} band={index % 2 === 1}>
          <h2 className="font-bold" style={{ ...heading, fontSize: 'var(--site-h2)' }}>
            {block.heading}
          </h2>
          <div className="mt-8">
            {block.items.map((item, itemIndex) => (
              <details
                key={itemIndex}
                className="group py-5"
                style={{ borderTop: `1px solid ${theme.safe.line}` }}
              >
                <summary
                  className="flex cursor-pointer list-none items-baseline justify-between gap-6 font-semibold marker:content-none"
                  style={{ ...heading, fontSize: 'var(--site-h3)' }}
                >
                  {item.title}
                  {/* Something to press. A closed `<details>` with no marker is
                      a heading as far as a visitor is concerned. */}
                  <span
                    aria-hidden
                    className="shrink-0 text-xl leading-none transition-transform group-open:rotate-45"
                    style={{ color: theme.safe.accent }}
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 leading-relaxed" style={{ ...muted, fontSize: 'var(--site-body)' }}>
                  {item.body}
                </p>
              </details>
            ))}
          </div>
        </Section>
      )

    case 'hours':
      return (
        <Section theme={theme} band={index % 2 === 1}>
          <h2 className="font-bold" style={{ ...heading, fontSize: 'var(--site-h2)' }}>
            {block.heading}
          </h2>
          <dl className="mt-8">
            {block.items.map((item, itemIndex) => (
              <div
                key={itemIndex}
                className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3.5"
                style={{ borderTop: `1px solid ${theme.safe.line}` }}
              >
                <dt className="font-medium" style={{ ...body, fontSize: 'var(--site-body)' }}>
                  {item.title}
                </dt>
                <dd style={{ ...muted, fontSize: 'var(--site-body)' }}>{item.body}</dd>
              </div>
            ))}
          </dl>
          {block.note && (
            <p className="mt-5 text-sm" style={muted}>
              {block.note}
            </p>
          )}
        </Section>
      )

    case 'contact':
      return (
        <Section theme={theme}>
          <h2 className="font-bold" style={{ ...heading, fontSize: 'var(--site-h2)' }}>
            {block.heading}
          </h2>
          {/* Left, with everything else on the page. `mx-auto` centred it
              inside a left-aligned section, so the sentence sat inboard of its
              own heading. */}
          <p className="mt-3 max-w-lg" style={muted}>
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
/**
 * Which photograph each block on a page gets — each one used once.
 *
 * A home page is often three `richText` blocks in a row; handing every one of
 * them the same portrait would print the same picture three times, which is the
 * single most obvious way a generated site announces itself as generated. The
 * first block that can carry a given scene takes it, and the ones after it fall
 * back to the type-and-space design.
 *
 * Exported because the builder's canvas has to make the same allocation and
 * cannot call `PageRenderer` — every block there is wrapped in its own
 * drag-and-drop shell. A second copy of this rule in the editor would be a
 * fourth way for the preview to disagree with the site.
 */
export function claimImages(blocks: Block[], images?: SiteImages) {
  const unused = { ...(images?.scenes ?? {}) }

  /* A section the customer has spoken for takes its picture first, whatever
     the automatic order would have done with it. */
  const chosen = new Map<number, 'hero' | 'people' | 'detail'>()
  blocks.forEach((block, index) => {
    const picture = 'picture' in block ? block.picture : undefined
    if (picture && picture !== 'none' && unused[picture]) {
      chosen.set(index, picture)
      delete unused[picture]
    }
  })

  return blocks.map((block, index): SiteImages | undefined => {
    if (!images) return undefined

    const asked = chosen.get(index)
    if (asked) return { ...images, scenes: { [asked]: images.scenes[asked] } }

    // "None" is an answer, not a gap to fill from the pile.
    if ('picture' in block && block.picture === 'none') return { ...images, scenes: {} }

    const wants =
      block.type === 'hero'
        ? 'hero'
        : block.type === 'richText'
          ? 'people'
          : block.type === 'services'
            ? 'detail'
            : null

    if (!wants || !unused[wants]) return { ...images, scenes: {} }

    const scene = { [wants]: unused[wants] }
    delete unused[wants]
    return { ...images, scenes: scene }
  })
}

export function PageRenderer({
  blocks,
  theme,
  images,
  register = 'editorial',
  base = '',
  contact,
}: {
  blocks: Block[]
  theme: SiteTheme
  images?: SiteImages
  /** The brand's bearing — see `lib/register.ts`. */
  register?: RegisterName
  /** What this site's own paths are prefixed with — see `basePath`. */
  base?: string
  contact?: ContactLabels
}) {
  const claimed = claimImages(blocks, images)

  return (
    <div style={{ backgroundColor: theme.safe.paper }}>
      {blocks.map((block, index) => (
        <BlockRenderer
          key={index}
          block={block}
          index={index}
          repeated={index > 0 && blocks[index - 1].type === block.type}
          theme={theme}
          images={claimed[index]}
          register={register}
          base={base}
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
