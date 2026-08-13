'use client'

import { CheckCircle2, ExternalLink, Globe, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Field } from '@/components/ui/field'
import { FieldError } from '@/components/ui/field-error'
import { Input } from '@/components/ui/input'
import { EVENTS, capture } from '@/lib/analytics'
import type { Pages, Theme } from '@/lib/blocks'
import {
  attachCustomDomain,
  discardDraft,
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
  planAllowsPublish,
  waiting,
  changedPages,
  onPublished,
  onTakenOffline,
  onDiscarded,
  canUseCustomDomain,
  atDomainLimit,
}: {
  projectId: string
  initialSubdomain: string | null
  initialCustomDomain: string | null
  isPublished: boolean
  canPublish: boolean
  planAllowsPublish: boolean
  /** Something in the working copy differs from what visitors are getting. */
  waiting: boolean
  /** Their names, already translated, for the list of what will change. */
  changedPages: string[]
  onPublished: () => void
  onTakenOffline: () => void
  onDiscarded: (pages: Pages, theme: Theme) => void
  canUseCustomDomain: boolean
  /** Plan allows domains, but every one it includes is already attached. */
  atDomainLimit: boolean
}) {
  const t = useTranslations('Builder')

  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  /*
   * Resolved when the dialog is opened rather than during render. Reading
   * `window` in the render body made the server emit a bare path and the client
   * a full URL, which is a hydration mismatch on every load; an event handler
   * only ever runs on the client, so there is nothing to disagree about.
   */
  const [liveUrl, setLiveUrl] = useState('')
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
      onPublished()
    },
  })

  const unpublish = useAction(unpublishWebsite, {
    onSuccess: () => {
      setPublished(false)
      onTakenOffline()
    },
  })

  /* The cheapest reassurance in the editor: undo covers a step, this covers an
     afternoon. Only offered once there is a live version to go back to. */
  const discard = useAction(discardDraft, {
    onSuccess: ({ data }) => {
      if (data) onDiscarded(data.pages as unknown as Pages, data.theme as unknown as Theme)
      setDiscarding(false)
      setOpen(false)
    },
  })

  const [discarding, setDiscarding] = useState(false)

  if (!canPublish) {
    /* Two different problems: an account that has not bought the feature, and a
       member who cannot use it on an account that has. Telling someone to
       upgrade a plan their organization already pays for sends them to billing
       to fix nothing. */
    const reason = planAllowsPublish ? t('publishNeedsAdmin') : t('publishLocked')

    return (
      <span className="text-xs text-fg-muted" title={reason}>
        {reason}
      </span>
    )
  }


  return (
    <div className="relative">
      <ConfirmDialog
        open={confirming}
        pending={publish.isPending}
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          publish.execute({ projectId, subdomain })
          setConfirming(false)
        }}
        title={t('confirmTitle')}
        body={
          <>
            {t('confirmBody')}
            <span className="mt-2 block break-all font-mono text-xs text-fg">{liveUrl}</span>
          </>
        }
        confirmLabel={t('publish')}
        cancelLabel={t('notYet')}
      />

      {/* The button says what pressing it does. "Published" was a label for a
          state, on the one control whose job is to change it. */}
      <Button size="sm" onClick={() => setOpen((value) => !value)}>
        <Globe />
        {published ? t('update') : t('publish')}
      </Button>

      {/*
        Fixed at 20rem, the panel ran off the edge of a 390px screen — the
        address field for a site about to go public, half of it past the
        viewport. Its width is now whichever is smaller: the panel it wants to
        be, or the screen it has, minus the page's own gutters.
      */}
      {open && (
        <div
          data-testid="publish-panel"
          className="absolute end-0 top-full z-20 mt-2 w-[min(20rem,calc(100vw-3rem))] rounded-card border border-line bg-surface p-4 shadow-lg"
        >
          <Field
            label={t('address')}
            hint={`${t('willBeLiveAt')} /sites/${subdomain || 'my-brand'}`}
            error={publish.result?.serverError}
          >
            <Input
              value={subdomain}
              onChange={(event) => setSubdomain(slugify(event.target.value))}
              placeholder="my-brand"
              autoFocus
            />
          </Field>

          {/*
            What pressing the button will do to the live site, named page by
            page. A customer who has been editing for an hour cannot otherwise
            know what they are about to show people.
          */}
          {published && (
            <div className="mt-4 border-t border-line pt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">
                {t('whatWillChange')}
              </p>
              {waiting ? (
                <>
                  <ul className="mt-2 space-y-1 text-sm text-fg-secondary">
                    {changedPages.map((page) => (
                      <li key={page}>{page}</li>
                    ))}
                    {changedPages.length === 0 && <li>{t('theColours')}</li>}
                  </ul>
                  <p className="mt-2 text-xs text-fg-muted">{t('visitorsSeeAtOnce')}</p>
                </>
              ) : (
                <p className="mt-2 text-sm text-fg-muted">{t('nothingWaiting')}</p>
              )}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            {/*
              Publishing puts a customer's site on the open internet under their
              client's name, and it used to take one press of a small button —
              less friction than deleting a draft, which has always asked. An
              update does not ask again: the address is already public, and the
              list above answers the question a dialog would have asked.
            */}
            <Button
              size="sm"
              className="flex-1"
              disabled={publish.isPending || subdomain.length < 3 || (published && !waiting)}
              onClick={() => {
                if (published) {
                  publish.execute({ projectId, subdomain })
                  return
                }
                setLiveUrl(`${window.location.origin}/sites/${subdomain}`)
                setConfirming(true)
              }}
            >
              {publish.isPending && <Loader2 className="animate-spin" />}
              {published ? t('update') : t('publish')}
            </Button>

            {published && waiting && (
              <Button
                size="sm"
                variant="ghost"
                disabled={discard.isPending}
                onClick={() => setDiscarding(true)}
              >
                {t('goBackToLive')}
              </Button>
            )}
          </div>

          {published && (
            <Button
              size="sm"
              variant="ghost"
              className="mt-2 w-full"
              disabled={unpublish.isPending}
              onClick={() => unpublish.execute({ projectId })}
            >
              {t('takeOffline')}
            </Button>
          )}

          <ConfirmDialog
            open={discarding}
            pending={discard.isPending}
            destructive
            onClose={() => setDiscarding(false)}
            onConfirm={() => discard.execute({ projectId })}
            title={t('discardTitle')}
            body={t('discardBody')}
            confirmLabel={t('goBackToLive')}
            cancelLabel={t('keepMyChanges')}
          />

          {published && liveSubdomain && (
            <a
              href={`/sites/${liveSubdomain}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm accent-text hover:underline"
            >
              <ExternalLink className="size-3.5" />
              {t('viewSite')}
            </a>
          )}

          {canUseCustomDomain && published && (
            <div className="mt-4 border-t border-line pt-4">
              {!domain && atDomainLimit ? (
                /*
                 * The plan's domains are all attached to other sites. Say that
                 * here rather than offering a field whose only outcome is the
                 * server refusing it — the same rule the publish control
                 * follows for a plan that cannot publish.
                 */
                <>
                  <span className="mb-1.5 block text-sm font-medium">{t('customDomain')}</span>
                  <p className="text-sm text-fg-secondary">{t('domainLimitReached')}</p>
                </>
              ) : !domain ? (
                <>
                  <Field label={t('customDomain')} error={attach.result?.serverError}>
                    <Input
                      value={domainInput}
                      onChange={(event) => setDomainInput(event.target.value)}
                      placeholder="example.com"
                      inputMode="url"
                      autoCapitalize="off"
                      spellCheck={false}
                    />
                  </Field>
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
                  <span className="mb-1.5 block text-sm font-medium">{t('customDomain')}</span>
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
                    <dl className="mt-2 space-y-1 rounded-control bg-elevated p-2.5 font-mono text-xs">
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
