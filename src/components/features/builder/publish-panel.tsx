'use client'

import { CheckCircle2, ExternalLink, Globe, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { FieldError } from '@/components/ui/field-error'
import { Input } from '@/components/ui/input'
import { EVENTS, capture } from '@/lib/analytics'
import {
  attachCustomDomain,
  publishWebsite,
  refreshCustomDomain,
  removeCustomDomain,
  unpublishWebsite,
} from '@/server/actions/website'

/** Mirrors the server-side grammar so the user is told before submitting. */
function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

type DomainRecord = { type: string; name: string; value: string }
type DomainState = { domain: string; verified: boolean; misconfigured: boolean; records: DomainRecord[] }

export function PublishPanel({
  projectId,
  initialSubdomain,
  initialCustomDomain,
  isPublished,
  canPublish,
  canUseCustomDomain,
}: {
  projectId: string
  initialSubdomain: string | null
  initialCustomDomain: string | null
  isPublished: boolean
  canPublish: boolean
  canUseCustomDomain: boolean
}) {
  const t = useTranslations('Builder')

  const [open, setOpen] = useState(false)
  const [subdomain, setSubdomain] = useState(initialSubdomain ?? '')
  const [published, setPublished] = useState(isPublished)
  const [liveSubdomain, setLiveSubdomain] = useState(initialSubdomain)

  const [domainInput, setDomainInput] = useState('')
  /*
   * Null until the domain is attached. Verification state is only known after
   * asking Vercel, so an attached domain with no state yet shows as pending
   * rather than claiming to be live.
   */
  const [domain, setDomain] = useState<DomainState | null>(
    initialCustomDomain
      ? { domain: initialCustomDomain, verified: false, misconfigured: true, records: [] }
      : null,
  )

  const attach = useAction(attachCustomDomain, {
    onSuccess: ({ data }) => {
      capture(EVENTS.customDomainAttached)
      if (data) setDomain(data)
      setDomainInput('')
    },
  })

  const refresh = useAction(refreshCustomDomain, {
    onSuccess: ({ data }) => {
      if (data) setDomain(data)
    },
  })

  const remove = useAction(removeCustomDomain, {
    onSuccess: () => setDomain(null),
  })

  const publish = useAction(publishWebsite, {
    onSuccess: ({ data }) => {
      capture(EVENTS.websitePublished)
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

          {canUseCustomDomain && published && (
            <div className="mt-4 border-t border-line pt-4">
              <span className="mb-1.5 block text-sm font-medium">{t('customDomain')}</span>

              {!domain ? (
                <>
                  <Input
                    value={domainInput}
                    onChange={(event) => setDomainInput(event.target.value)}
                    placeholder="example.com"
                    inputMode="url"
                    autoCapitalize="off"
                    spellCheck={false}
                  />
                  <FieldError message={attach.result?.serverError} />
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-2 w-full"
                    disabled={attach.isPending || domainInput.trim().length < 4}
                    onClick={() => attach.execute({ projectId, domain: domainInput })}
                  >
                    {attach.isPending && <Loader2 className="animate-spin" />}
                    {t('connectDomain')}
                  </Button>
                </>
              ) : (
                <>
                  <p className="flex items-center gap-1.5 break-all text-sm">
                    {domain.verified && !domain.misconfigured && (
                      <CheckCircle2 className="size-3.5 shrink-0 text-success" />
                    )}
                    {domain.domain}
                  </p>

                  <p className="mt-1 text-xs text-fg-muted">
                    {domain.verified && !domain.misconfigured
                      ? t('domainLive')
                      : t('domainPendingDns')}
                  </p>

                  {/* The customer has to create these at their own DNS host —
                      nothing here can do it for them. */}
                  {domain.records.length > 0 && !(domain.verified && !domain.misconfigured) && (
                    <dl className="mt-2 space-y-1 rounded-lg bg-elevated p-2.5 font-mono text-xs">
                      {domain.records.map((record) => (
                        <div key={`${record.type}-${record.name}`} className="flex gap-2">
                          <dt className="shrink-0 text-fg-muted">{record.type}</dt>
                          <dd className="break-all">
                            {record.name} → {record.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}

                  <FieldError message={refresh.result?.serverError ?? remove.result?.serverError} />

                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1"
                      disabled={refresh.isPending}
                      onClick={() => refresh.execute({ projectId })}
                    >
                      {refresh.isPending && <Loader2 className="animate-spin" />}
                      {t('checkDomain')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={remove.isPending}
                      onClick={() => remove.execute({ projectId })}
                    >
                      {t('removeDomain')}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
