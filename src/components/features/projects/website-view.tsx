import { ExternalLink } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { buttonVariants } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import type { WebsiteAsset } from '@/server/db/schema'

type Block = { type: string } & Record<string, unknown>

const PAGE_ORDER = ['home', 'about', 'services', 'contact'] as const

/**
 * The website, shown rather than described.
 *
 * This used to render every content block of every page as a bordered card
 * inside a card inside a card, each one labelled with its block type — so a
 * customer looking at their own brand book read the words `RICHTEXT` and
 * `SERVICES`. Two thousand pixels of a CMS schema, on a surface that cannot
 * edit any of it, duplicating what the builder opens one click away.
 *
 * The site is already published on this origin, so it can simply be shown. A
 * real render of the real page answers "did I get a website" in one look, which
 * is the only question this section is here to answer. Editing stays where
 * editing happens.
 */
export async function WebsiteView({
  website,
  /**
   * Hides the one control on this section.
   *
   * Set by the support screen, which shows a customer's project to somebody who
   * does not own it: the builder is org-scoped, so the button would be a link
   * to a 404 — and it should not work even if it could, because looking at
   * someone's work is not permission to edit it.
   */
  readOnly = false,
}: {
  website: WebsiteAsset
  readOnly?: boolean
}) {
  const t = await getTranslations('Website')
  const pages = website.pages as Record<string, Block[]>

  const present = PAGE_ORDER.filter((page) => pages[page]?.length)
  const live = website.isPublished && website.subdomain

  /* Edits are private until they are published now, so a customer who edited
     and left needs telling from here — this page is where they come back to. */
  const waiting =
    live &&
    JSON.stringify(website.pages ?? {}) !== JSON.stringify(website.publishedPages ?? {})

  return (
    <section className="space-y-5">
      {/*
        Published or not is the first thing anyone wants from this section, and
        it was a line of loose text floating above the cards. It gets a bar of
        its own, with a dot carrying the state alongside the words rather than
        instead of them.
      */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface/60 px-5 py-3">
        {live && waiting ? (
          <span className="inline-flex min-w-0 items-center gap-2 text-sm">
            <span className="size-2 shrink-0 rounded-full bg-warning" />
            <span className="text-fg-secondary">{t('changesWaiting')}</span>
          </span>
        ) : live ? (
          <a
            href={`/sites/${website.subdomain}`}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex min-w-0 items-center gap-2 text-sm"
          >
            <span className="size-2 shrink-0 rounded-full bg-success" />
            <span className="text-fg-secondary">{t('liveAt')}</span>
            <span dir="ltr" className="truncate accent-text group-hover:underline">
              /sites/{website.subdomain}
            </span>
            <ExternalLink className="size-3.5 shrink-0 text-fg-muted" />
          </a>
        ) : (
          <span className="inline-flex items-center gap-2 text-sm text-fg-muted">
            <span className="size-2 shrink-0 rounded-full bg-fg-muted/50" />
            {t('notPublished')}
          </span>
        )}

        {!readOnly && (
          <Link
            href={`/dashboard/projects/${website.projectId}/builder`}
            className={buttonVariants({ size: 'sm' })}
          >
            {t('edit')}
          </Link>
        )}
      </div>

      {/* The sentence this product has never said to the person it was written
          for: their site exists, it is theirs to correct, and putting it online
          is a separate act they control. */}
      {!live && <p className="text-sm text-fg-secondary">{t('readyToLookOver')}</p>}

      {live ? (
        <SitePreview subdomain={website.subdomain!} label={t('openSite')} />
      ) : (
        /*
         * Nothing to render until it is published, so the pages are listed by
         * what is actually on them — their own first heading — rather than by
         * the block types that produce it.
         */
        <ul className="divide-y divide-line overflow-hidden rounded-card border border-line">
          {present.map((page) => (
            <li key={page} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3.5">
              <span className="text-sm font-medium capitalize">{t(`pages.${page}`)}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-fg-secondary">
                {firstHeading(pages[page]) ?? t('blockCount', { count: pages[page].length })}
              </span>
              <span className="text-xs text-fg-muted">
                {t('blockCount', { count: pages[page].length })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** The page's own words, so a summary never has to name a block type. */
function firstHeading(blocks: Block[]) {
  for (const block of blocks) {
    const heading = block.title ?? block.heading
    if (typeof heading === 'string' && heading.trim()) return heading
  }

  return null
}

/**
 * The live site, in a frame.
 *
 * Deliberately not sandboxed, after trying both alternatives.
 *
 * The framed document is this app's own `/sites/[subdomain]` route rendering
 * typed block data through React, so every string is escaped and there is no
 * path for injected markup — the only `dangerouslySetInnerHTML` in the codebase
 * is the theme script, which this route does not include. There is no
 * third-party content here to isolate from.
 *
 * Sandboxing costs more than it buys. A sandbox gives the frame an opaque
 * origin, which makes every `_next/static` request cross-origin — and the dev
 * server refuses those, including the stylesheet, so the preview renders as
 * unstyled markup while you are building. An opaque origin cannot be added to
 * `allowedDevOrigins` either, because it has no origin to name.
 *
 * `pointer-events-none` and `tabIndex={-1}` are what make it inert: this is a
 * picture, not an application. Scrolling the page never gets captured by a
 * frame in the middle of it, nothing inside can take focus, and the whole thing
 * is one link to the real site.
 */
function SitePreview({ subdomain, label }: { subdomain: string; label: string }) {
  return (
    <a
      href={`/sites/${subdomain}`}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="group block overflow-hidden rounded-card border border-line bg-surface transition-shadow duration-200 hover:shadow-[var(--shadow-lifted)]"
    >
      {/* The same browser-frame language the logo usage panel already uses. */}
      <div className="flex items-center gap-2 border-b border-line bg-elevated/50 px-4 py-2.5">
        <span aria-hidden className="flex gap-1.5">
          <span className="size-2 rounded-full bg-fg-muted/30" />
          <span className="size-2 rounded-full bg-fg-muted/30" />
          <span className="size-2 rounded-full bg-fg-muted/30" />
        </span>
        <span
          dir="ltr"
          className="min-w-0 flex-1 truncate rounded-full bg-surface px-3 py-1 text-center text-xs text-fg-muted"
        >
          /sites/{subdomain}
        </span>
        <ExternalLink className="size-3.5 shrink-0 text-fg-muted transition-colors group-hover:text-fg" />
      </div>

      {/*
        A clean crop, not a fade.

        A gradient here has to fade to *something*, and the only colours
        available are the app's dark surface or a hard-coded white — while what
        is underneath is the customer's own page background, which is neither.
        Fading dark navy over a white site read as a smear. The browser chrome
        above already says "this is a window onto a page", so the cut does the
        job the fade was invented for, and honestly.
      */}
      <div className="h-[26rem] bg-white">
        <iframe
          src={`/sites/${subdomain}`}
          title={label}
          loading="lazy"
          tabIndex={-1}
          className="pointer-events-none size-full border-0"
        />
      </div>
    </a>
  )
}
