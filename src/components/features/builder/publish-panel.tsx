'use client'

import { ExternalLink, Globe, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { FieldError } from '@/components/ui/field-error'
import { Input } from '@/components/ui/input'
import { publishWebsite, unpublishWebsite } from '@/server/actions/website'

/** Mirrors the server-side grammar so the user is told before submitting. */
function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

export function PublishPanel({
  projectId,
  initialSubdomain,
  isPublished,
  canPublish,
}: {
  projectId: string
  initialSubdomain: string | null
  isPublished: boolean
  canPublish: boolean
}) {
  const t = useTranslations('Builder')

  const [open, setOpen] = useState(false)
  const [subdomain, setSubdomain] = useState(initialSubdomain ?? '')
  const [published, setPublished] = useState(isPublished)
  const [liveSubdomain, setLiveSubdomain] = useState(initialSubdomain)

  const publish = useAction(publishWebsite, {
    onSuccess: ({ data }) => {
      setPublished(true)
      setLiveSubdomain(data?.subdomain ?? subdomain)
      setOpen(false)
    },
  })

  const unpublish = useAction(unpublishWebsite, {
    onSuccess: () => setPublished(false),
  })

  if (!canPublish) {
    return (
      <span className="text-xs text-fg-muted" title={t('publishLocked')}>
        {t('publishLocked')}
      </span>
    )
  }

  return (
    <div className="relative">
      <Button size="sm" onClick={() => setOpen((value) => !value)}>
        <Globe />
        {published ? t('published') : t('publish')}
      </Button>

      {open && (
        <div className="absolute end-0 top-full z-20 mt-2 w-80 rounded-xl border border-line bg-surface p-4 shadow-lg">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">{t('address')}</span>
            <Input
              value={subdomain}
              onChange={(event) => setSubdomain(slugify(event.target.value))}
              placeholder="my-brand"
              autoFocus
            />
          </label>

          <p className="mt-1.5 break-all text-xs text-fg-muted">
            {t('willBeLiveAt')} /sites/{subdomain || 'my-brand'}
          </p>

          <FieldError message={publish.result?.serverError} />

          <div className="mt-4 flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              disabled={publish.isPending || subdomain.length < 3}
              onClick={() => publish.execute({ projectId, subdomain })}
            >
              {publish.isPending && <Loader2 className="animate-spin" />}
              {published ? t('update') : t('publish')}
            </Button>

            {published && (
              <Button
                size="sm"
                variant="ghost"
                disabled={unpublish.isPending}
                onClick={() => unpublish.execute({ projectId })}
              >
                {t('unpublish')}
              </Button>
            )}
          </div>

          {published && liveSubdomain && (
            <a
              href={`/sites/${liveSubdomain}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-brand hover:underline"
            >
              <ExternalLink className="size-3.5" />
              {t('viewSite')}
            </a>
          )}
        </div>
      )}
    </div>
  )
}
