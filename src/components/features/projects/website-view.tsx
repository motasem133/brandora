import { ExternalLink } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { Link } from '@/i18n/navigation'
import type { WebsiteAsset } from '@/server/db/schema'

type Block = { type: string } & Record<string, unknown>

const PAGE_ORDER = ['home', 'about', 'services', 'contact'] as const

export async function WebsiteView({ website }: { website: WebsiteAsset }) {
  const t = await getTranslations('Website')
  const pages = website.pages as Record<string, Block[]>

  return (
    <div className="space-y-6">
      {/*
        Published or not is the first thing anyone wants from this tab, and it
        was a line of loose text floating above the cards. It gets a bar of its
        own, with a dot carrying the state alongside the words rather than
        instead of them.
      */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface/60 px-5 py-3">
        {website.isPublished && website.subdomain ? (
          <a
            href={`/sites/${website.subdomain}`}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex min-w-0 items-center gap-2 text-sm"
          >
            <span className="size-2 shrink-0 rounded-full bg-success" />
            <span className="text-fg-secondary">{t('liveAt')}</span>
            <span dir="ltr" className="truncate text-brand group-hover:underline">
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

        <Link
          href={`/dashboard/projects/${website.projectId}/builder`}
          className={buttonVariants({ size: 'sm' })}
        >
          {t('edit')}
        </Link>
      </div>

      {PAGE_ORDER.filter((page) => pages[page]?.length).map((page) => (
        <Card key={page} className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="capitalize">{t(`pages.${page}`)}</CardTitle>
            <Badge>{t('blockCount', { count: pages[page].length })}</Badge>
          </div>

          <div className="space-y-3">
            {pages[page].map((block, index) => (
              <BlockPreview key={index} block={block} />
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}

/**
 * Read-only preview of a content block.
 *
 * Renders from the same typed block data the builder and the published site
 * will use, so what is shown here cannot drift from what gets published.
 */
function BlockPreview({ block }: { block: Block }) {
  const items = (block.items ?? block.services) as
    | { title: string; body: string; price?: string }[]
    | undefined

  return (
    <div className="rounded-lg border border-line bg-elevated/40 p-4">
      <p className="mb-2 text-xs uppercase tracking-wide text-fg-muted">{block.type}</p>

      {typeof block.title === 'string' && (
        <p className="font-display text-lg font-semibold">{block.title}</p>
      )}
      {typeof block.heading === 'string' && (
        <p className="font-display text-lg font-semibold">{block.heading}</p>
      )}
      {typeof block.subtitle === 'string' && (
        <p className="mt-1 text-sm text-fg-secondary">{block.subtitle}</p>
      )}
      {typeof block.body === 'string' && (
        <p className="mt-1 text-sm leading-relaxed text-fg-secondary">{block.body}</p>
      )}

      {items && (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {items.map((item, index) => (
            <li key={index} className="rounded-md border border-line p-3">
              <p className="text-sm font-medium">{item.title}</p>
              <p className="mt-0.5 text-sm text-fg-secondary">{item.body}</p>
              {item.price && <p className="mt-1 text-sm text-brand">{item.price}</p>}
            </li>
          ))}
        </ul>
      )}

      {typeof block.email === 'string' && (
        <p className="mt-2 text-sm text-brand">{block.email}</p>
      )}
      {typeof block.cta === 'string' && (
        <span className="mt-3 inline-block rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-brand-fg">
          {block.cta}
        </span>
      )}
    </div>
  )
}
