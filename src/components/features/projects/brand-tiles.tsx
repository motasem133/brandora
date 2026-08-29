import { ArrowRight } from 'lucide-react'

import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import type { GeneratedFile } from '@/server/db/schema'

/**
 * A brand, as one screen of tiles.
 *
 * This replaces the wall, and the reason is worth keeping. The page before the
 * wall was a workspace pretending to be a document — eight thousand pixels of
 * logo studio, editable sheet, variations and website preview, stacked, where
 * everything was reachable and nothing was visible. The wall fixed that: one
 * screen that answers "what do I have?", with the tools one press behind it
 * through `?open=`.
 *
 * That answer survives intact. What goes is the pinned-sheet clothing — the
 * pins, the cast-shadow paper, the caption hanging below the frame — because
 * the metaphor it belonged to was retired. A tile states what it holds in a
 * header, in chrome, at the same size on every tile, and hands its whole body
 * to the artefact. Ten tiles read as one instrument rather than as ten objects
 * arranged on a surface.
 */
export function TileGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
  )
}

/**
 * One tile, pressable, opening its working view below.
 *
 * `guest` decides whose paper the *body* is. The mark, the palette, the type and
 * the written work are the brand and wear the brand's own ground; a file count
 * or a publish state is the machine talking about the brand and wears the
 * room's. Getting that backwards undoes the identity plate's whole argument —
 * the customer's colours are the product, ours are the furniture — one tile at
 * a time.
 *
 * The header is always chrome, guest body or not. It is the product's own voice
 * saying what this is and how much of it there is, and a header tinted per
 * brand is a label you have to re-learn on every page.
 */
export function Tile({
  href,
  title,
  meta,
  active,
  guest,
  vars,
  children,
}: {
  href: string
  title: string
  /** The count, the size, the date — whatever answers "how much of it". */
  meta?: string
  /** This tile's working view is the one open below. */
  active?: boolean
  guest?: boolean
  vars?: React.CSSProperties
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      /* Same reason as the rail's destinations: this page is dynamic, so
         without this the press renders the whole route from cold. */
      unstable_dynamicOnHover
      aria-current={active ? 'true' : undefined}
      className={cn(
        'group block rounded-card outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
      )}
    >
      <article
        className={cn(
          'flex h-full flex-col overflow-hidden rounded-card bg-surface ring-1 transition-shadow duration-200',
          'shadow-[var(--shadow-soft)] group-hover:shadow-[var(--shadow-lifted)]',
          active ? 'ring-2 ring-brand' : 'ring-line',
        )}
      >
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h3 className="truncate text-sm font-semibold text-fg">{title}</h3>
          {meta && <span className="shrink-0 text-xs text-fg-muted">{meta}</span>}
        </header>

        <div
          style={guest ? vars : undefined}
          className={cn(
            'flex min-h-0 min-h-[9.5rem] flex-1 flex-col p-4',
            guest && 'bg-[var(--guest-paper)]',
          )}
        >
          {children}
        </div>
      </article>
    </Link>
  )
}

/**
 * A tile for something this brand does not have yet.
 *
 * The one element the argument turns on, and the reason it is its own component
 * rather than a disabled variant.
 *
 * The treatment this descends from named the missing thing, drew a mockup of it
 * and put a lock and a link under it. It converted nobody — live since 14
 * August, every account since has seen it, not one started a checkout. The
 * difference was never the argument, it is the shape: a locked card is a thing
 * you are being kept out of, and a gap in work you already own is a gap. That
 * finding outlived the board it was discovered on, so it is what this keeps.
 *
 * So: an open frame in the same grid, at the same size, with the same header as
 * every filled tile beside it. Dashed rather than solid because the frame is
 * empty, not because the control is broken — nothing here is greyed out, which
 * is the visual language of something that does not work. The price sits on the
 * action, because PRODUCT.md is explicit that anything which can spend a
 * customer's credits says so at the control that spends them.
 */
export function LockedTile({
  title,
  meta,
  benefit,
  action,
  price,
  href = '/dashboard/billing',
}: {
  title: string
  /** What it would cost, in the same slot a filled tile puts its count. */
  meta: string
  /** One line on what it is, in the product's own words. */
  benefit: string
  action: string
  /** Which plan carries it, beside the action rather than under a lock. */
  price: string
  href?: string
}) {
  return (
    <Link href={href} className="group block rounded-card outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
      <article className="flex h-full flex-col overflow-hidden rounded-card border border-dashed border-line-strong bg-elevated/50 transition-colors group-hover:border-brand/40 group-hover:bg-elevated">
        <header className="flex items-center justify-between gap-3 border-b border-dashed border-line px-4 py-3">
          <h3 className="truncate text-sm font-semibold text-fg-secondary">{title}</h3>
          <span className="shrink-0 font-mono text-xs text-fg-muted tabular-nums">{meta}</span>
        </header>

        <div className="flex min-h-[9.5rem] flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
          <p className="text-balance text-sm text-fg-secondary">{benefit}</p>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
            {action}
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
          </span>
          <span className="font-mono text-xs text-fg-muted tabular-nums">{price}</span>
        </div>
      </article>
    </Link>
  )
}

/**
 * The mark on its own paper — the one tile that is purely the work.
 *
 * `darkPaper` turns off the blend. `multiply` is what dissolves the rectangle
 * around a mark whose raster plate is white while the brand's paper is cream;
 * on a dark paper it instead multiplies a light mark toward black and the
 * artwork disappears. The caller knows which, because it owns the theme.
 */
export function MarkSheet({
  logo,
  alt,
  darkPaper,
}: {
  logo: GeneratedFile
  alt: string
  darkPaper?: boolean
}) {
  return (
    <div className="grid flex-1 place-items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/files/${logo.id}`}
        alt={alt}
        loading="lazy"
        className={cn('max-h-[6.5rem] w-full object-contain', !darkPaper && 'mix-blend-multiply')}
      />
    </div>
  )
}

export function PaletteSheet({ swatches }: { swatches: string[] }) {
  return (
    <div className="flex flex-1 items-stretch">
      <div className="flex w-full overflow-hidden rounded-control shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--text-primary)_10%,transparent)]">
        {swatches.map((hex, index) => (
          <span key={`${hex}-${index}`} className="flex-1" style={{ backgroundColor: hex }} />
        ))}
      </div>
    </div>
  )
}

/** The two faces, set in themselves — a font list proves nothing a specimen does. */
export function TypeSheet({
  name,
  slogan,
  heading,
  body,
}: {
  name: string
  slogan: string | null
  heading?: string
  body?: string
}) {
  return (
    <div className="flex flex-1 flex-col justify-center overflow-hidden">
      <p
        dir="auto"
        className="truncate text-2xl leading-tight"
        style={{ fontFamily: heading, color: 'var(--guest-ink)' }}
      >
        {name}
      </p>
      {slogan && (
        <p
          dir="auto"
          className="mt-1.5 line-clamp-2 text-sm"
          style={{ fontFamily: body, color: 'var(--guest-ink-soft)' }}
        >
          {slogan}
        </p>
      )}
    </div>
  )
}

/** Words — a story, a bio, a brief. Clamped, because a tile is not the text. */
export function TextSheet({ body, font }: { body: string; font?: string }) {
  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <p
        dir="auto"
        className="text-sm leading-relaxed"
        style={{ fontFamily: font, color: 'var(--guest-ink-soft, var(--text-secondary))' }}
      >
        {body}
      </p>
      {/* The cut is faded rather than left as a hard crop mid-word: a tile is a
          summary, and a summary that ends abruptly reads as broken. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-8"
        style={{
          background:
            'linear-gradient(to bottom, transparent, var(--guest-paper, var(--bg-surface)))',
        }}
      />
    </div>
  )
}

export function ThumbsSheet({ files, alt }: { files: GeneratedFile[]; alt: string }) {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-3 items-center gap-2">
      {files.slice(0, 3).map((file) => (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          key={file.id}
          src={`/api/files/${file.id}`}
          alt={alt}
          loading="lazy"
          className="aspect-square w-full rounded-control bg-white object-cover shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--text-primary)_10%,transparent)]"
        />
      ))}
    </div>
  )
}

/** For the tiles that are a state rather than a picture. */
export function FactsSheet({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="flex flex-1 flex-col justify-center gap-2.5">
      {rows.map(([key, value]) => (
        <div key={key} className="flex items-baseline justify-between gap-3">
          <dt className="text-sm text-fg-secondary">{key}</dt>
          <dd dir="auto" className="truncate font-mono text-xs text-fg tabular-nums">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
