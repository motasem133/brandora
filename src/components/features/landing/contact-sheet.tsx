import { FileText } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import Image from 'next/image'

import { Cell } from '@/components/ui/horizon'
import { MomentumField, MomentumItem } from '@/components/ui/momentum'
import { cn } from '@/lib/utils'
import { PaletteDeal, PillFan } from './flourish'
import { BRAND_KIT_PDF, FONTS, LOGOS, PALETTE, POSTS, SITE_ADDRESS } from './sultana'

/**
 * Everything one run produced, laid out on the brand's own paper.
 *
 * This replaces a bento of dark tiles with small white squares inside them. The
 * deliverables are the product, and they were being shown at thumbnail size on
 * a ground that made them all look like the same grey object. Here the section
 * is Sultana's cream and the artifacts are at the size each one rewards looking
 * at — which is also the Guest Palette Rule finally being spent on the page that
 * is selling the idea.
 *
 * Two things it has to make unmistakable, because the old layout buried both:
 * the website is a real deliverable, not a word in a list of leftovers; and the
 * social kit is designed images, not just captions.
 */

/** A tile. One padding, one radius, one hairline — set once, not per card. */
function Tile({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'flex h-full flex-col rounded-card border border-line bg-surface p-6 sm:p-7',
        className,
      )}
    >
      {children}
    </div>
  )
}

function TileLabel({ children }: { children: React.ReactNode }) {
  return <p className="type-eyebrow text-fg-muted">{children}</p>
}

export async function ContactSheet() {
  const t = await getTranslations('Landing')
  const rest = t.raw('restItems') as string[]
  const pages = t.raw('kitWebsitePages') as string[]

  return (
    <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
      {/* ------------------------------------------------------------ logos */}
      {/*
        The one place a visitor can put a hand on the output, so it is the one
        place that answers back. No `lift` on the cell: two things responding to
        one hover is not twice as responsive, and a wrapper that moves out from
        under the cursor makes a momentum tile re-enter itself forever.
      */}
      <Cell index={0} lift={false} className="sm:col-span-2 lg:col-span-4 lg:row-span-2">
        <Tile>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <TileLabel>{t('kitLogos')}</TileLabel>
            <p className="text-xs text-fg-muted">{t('kitLogosNote')}</p>
          </div>

          {/* The marks are transparent traces, so they sit on the brand's paper
              rather than in white boxes on it — which is what a logo sheet
              actually looks like, and one less rectangle per concept. */}
          <MomentumField className="mt-6 grid flex-1 grid-cols-2 gap-4 lg:grid-cols-4">
            {LOGOS.map((logo) => (
              <MomentumItem key={logo.src} throwGain={0.4} spinGain={0.09}>
                <div className="flex h-full min-h-28 items-center justify-center rounded-control border border-line p-4">
                  <Image
                    src={logo.src}
                    alt={t('kitLogoAlt')}
                    width={logo.width}
                    height={logo.height}
                    className="max-h-20 w-full object-contain"
                    sizes="(max-width: 640px) 40vw, 200px"
                  />
                </div>
              </MomentumItem>
            ))}
          </MomentumField>
        </Tile>
      </Cell>

      {/* ---------------------------------------------------------- palette */}
      <Cell index={1} className="lg:col-span-2">
        <Tile>
          <TileLabel>{t('kitPalette')}</TileLabel>
          <PaletteDeal colors={[...PALETTE]} className="mt-5 flex min-h-24 flex-1 gap-2" />
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-fg-muted">
            {PALETTE.map((hex) => (
              <span key={hex}>{hex}</span>
            ))}
          </div>
        </Tile>
      </Cell>

      {/* ------------------------------------------------------- typography */}
      <Cell index={2} className="lg:col-span-2">
        <Tile>
          <TileLabel>{t('kitType')}</TileLabel>
          <div className="mt-5 flex flex-1 flex-col justify-end">
            <p className="font-display text-3xl font-semibold tracking-[-0.02em]">
              {FONTS.heading}
            </p>
            <p className="mt-1 text-sm text-fg-secondary">{FONTS.body}</p>
          </div>
        </Tile>
      </Cell>

      {/* ---------------------------------------------------------- website */}
      {/*
        Promoted out of the "and the rest of it" pill list, where a whole
        published website had been sitting next to "Favicon".

        A diagram rather than a screenshot, deliberately and visibly: no
        capture of a generated site exists in this repo, and inventing one on
        the page that sells generated sites is the single worst place to put a
        mockup. What a first-time visitor needs from this tile is the shape of
        the thing — real address form, real page set, chosen per business — and
        that is what it shows.
      */}
      <Cell index={3} className="sm:col-span-2 lg:col-span-4 lg:row-span-2">
        <Tile>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <TileLabel>{t('kitWebsite')}</TileLabel>
            <p className="text-xs text-fg-muted">{t('kitWebsiteNote')}</p>
          </div>

          <div className="mt-6 flex-1 overflow-hidden rounded-control border border-line">
            {/* Browser chrome, with the address in the form a published site
                actually takes. Not a link: customer subdomains do not resolve
                yet, and a dead href on the tile promising a live website is
                worse than no href at all. */}
            <div className="flex items-center gap-2 border-b border-line bg-elevated px-3 py-2">
              <span aria-hidden className="flex gap-1">
                {[0, 1, 2].map((dot) => (
                  <span key={dot} className="size-2 rounded-full bg-line-strong" />
                ))}
              </span>
              <span className="truncate font-mono text-xs text-fg-muted">{SITE_ADDRESS}</span>
            </div>

            <div className="p-5">
              {/* The pages the run chose for this business, named. */}
              <ul className="flex flex-wrap gap-2">
                {pages.map((page) => (
                  <li
                    key={page}
                    className="rounded-full border border-line px-3 py-1 text-xs text-fg-secondary"
                  >
                    {page}
                  </li>
                ))}
              </ul>

              {/* A blocked-out page, in the brand's own colours — the structure
                  a generated home page has, not a picture of one. */}
              <div aria-hidden className="mt-5 space-y-2.5">
                <div
                  className="h-16 rounded-control"
                  style={{ backgroundColor: 'var(--guest-accent)', opacity: 0.9 }}
                />
                <div className="flex gap-2.5">
                  <div className="h-8 flex-1 rounded-control bg-elevated" />
                  <div className="h-8 flex-1 rounded-control bg-elevated" />
                  <div className="h-8 flex-1 rounded-control bg-elevated" />
                </div>
                <div className="h-3 w-2/3 rounded-full bg-elevated" />
                <div className="h-3 w-1/2 rounded-full bg-elevated" />
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs text-fg-muted">{t('kitWebsitePagesNote')}</p>
        </Tile>
      </Cell>

      {/* ----------------------------------------------------------- social */}
      <Cell index={4} className="sm:col-span-2 lg:col-span-2 lg:row-span-2">
        <Tile>
          <TileLabel>{t('kitSocial')}</TileLabel>

          <div className="mt-5 grid flex-1 grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-2">
            {POSTS.map((post) => (
              <div key={post} className="overflow-hidden rounded-control">
                <Image
                  src={post}
                  alt={t('kitSocialAlt')}
                  width={1080}
                  height={1080}
                  className="size-full object-cover"
                  sizes="(max-width: 1024px) 30vw, 150px"
                />
              </div>
            ))}
          </div>

          {/* The document itself, not a picture of it — the real file the run
              produced, so the claim can be checked rather than believed. */}
          <a
            href={BRAND_KIT_PDF}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex w-fit items-center gap-2 rounded-control border border-line px-3 py-2 text-xs text-fg-secondary transition-colors hover:bg-elevated hover:text-fg"
          >
            <FileText className="size-3.5" />
            {t('kitPdf')}
          </a>
        </Tile>
      </Cell>

      {/* ------------------------------------------------------------- name */}
      <Cell index={5} className="lg:col-span-2">
        <Tile>
          <TileLabel>{t('kitNames')}</TileLabel>
          <div className="mt-5 flex flex-1 flex-col justify-end">
            <p className="font-display text-3xl font-semibold tracking-[-0.02em]">Sultana</p>
            <p className="mt-2 text-sm leading-relaxed text-fg-secondary">{t('kitNameReason')}</p>
          </div>
        </Tile>
      </Cell>

      {/* ------------------------------------------------------------- rest */}
      <Cell index={6} className="lg:col-span-2">
        <Tile>
          <TileLabel>{t('kitRest')}</TileLabel>
          <PillFan items={rest} className="mt-5 flex flex-1 flex-wrap content-end gap-2" />
        </Tile>
      </Cell>
    </div>
  )
}
