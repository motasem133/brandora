import { Link } from '@/i18n/navigation'
import { Tacked } from '@/components/ui/tacked'
import { cn } from '@/lib/utils'
import type { GeneratedFile } from '@/server/db/schema'

/**
 * A brand, as one screen.
 *
 * This page was a workspace pretending to be a document: eight thousand pixels
 * of logo studio, editable brand sheet, nine variations, nine kit images and a
 * website preview, stacked. Everything on it was reachable and nothing on it
 * was *visible* — a customer could not see their own brand without scrolling
 * past the tools for changing it, and the first thing they met on opening the
 * brand they had just paid attention to was a canvas of controls.
 *
 * So the page opens as the wall and the tools move one press away. Every sheet
 * is the artefact itself at a size worth judging, captioned with what it is and
 * how much of it there is; pressing one opens its working view underneath,
 * through `?open=` so it survives a reload and can be linked to. Nothing is
 * hidden — it is one press instead of one scroll, which is the difference
 * between a brand you can see and a brand you can find.
 *
 * The gaps hang here too. A missing website and a missing kit are frames with
 * their pins in, because a wall that shows only what exists cannot tell you
 * what does not — which is the whole reason the free customer never learns the
 * paid deliverables are a thing.
 */
export function Wall({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {children}
    </div>
  )
}

/**
 * One sheet, hung and pressable.
 *
 * `guest` decides whose paper it is. The mark, the palette, the type and the
 * written work are the brand and wear the brand's own ground; a count of files
 * or a publish state is the machine talking about the brand and wears the
 * room's. Getting that backwards is how the identity plate's whole argument —
 * the customer's colours are the product, ours are the furniture — gets undone
 * one card at a time.
 */
export function WallFrame({
  href,
  caption,
  meta,
  active,
  guest,
  vars,
  children,
}: {
  href: string
  caption: string
  meta?: string
  /** This sheet's working view is the one open below. */
  active?: boolean
  guest?: boolean
  vars?: React.CSSProperties
  children: React.ReactNode
}) {
  return (
    <Tacked caption={caption} meta={meta}>
      <Link
        href={href}
        /* Same reason as the app bar's tabs: this page is dynamic, so without
           this the press renders the whole route from cold. */
        unstable_dynamicOnHover
        aria-current={active ? 'true' : undefined}
        className={cn(
          'group block overflow-hidden rounded-card outline-none transition-shadow duration-200',
          'shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-lifted,var(--shadow-soft))]',
          'focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
          active && 'ring-2 ring-brand',
        )}
        style={guest ? vars : undefined}
      >
        <div
          className={cn(
            'flex h-[13rem] flex-col justify-between p-5',
            guest ? 'bg-[var(--guest-paper)]' : 'bg-surface',
          )}
        >
          {children}
        </div>
      </Link>
    </Tacked>
  )
}

/** The mark on its own paper — the one sheet that is purely the work. */
export function MarkSheet({ logo, alt }: { logo: GeneratedFile; alt: string }) {
  return (
    <div className="grid flex-1 place-items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/files/${logo.id}`}
        alt={alt}
        loading="lazy"
        className="max-h-[7.5rem] w-full object-contain"
      />
    </div>
  )
}

export function PaletteSheet({ swatches }: { swatches: string[] }) {
  return (
    <div className="flex flex-1 items-stretch">
      <div className="flex w-full overflow-hidden rounded-control">
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
        className="truncate text-[1.7rem] leading-tight"
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

/** Words — a story, a bio, a brief. Clamped, because a sheet is not the text. */
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
      {/* The cut is faded rather than left as a hard crop mid-word: a sheet is a
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
          className="aspect-square w-full rounded-[4px] bg-white object-cover"
        />
      ))}
    </div>
  )
}

/** For the sheets that are a state rather than a picture. */
export function FactsSheet({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="flex flex-1 flex-col justify-center gap-2.5">
      {rows.map(([key, value]) => (
        <div key={key} className="flex items-baseline justify-between gap-3">
          <dt className="text-sm text-fg-secondary">{key}</dt>
          <dd dir="auto" className="truncate font-mono text-xs text-fg">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
