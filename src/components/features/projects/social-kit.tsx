'use client'

import { Download, Images, Loader2, Lock, MailWarning, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'

import { EmailVerification } from '@/components/features/settings/email-verification'
import { Button } from '@/components/ui/button'
import { Disclosure } from '@/components/ui/disclosure'
import { FieldError } from '@/components/ui/field-error'
import { Link } from '@/i18n/navigation'
import { generateSocialKit } from '@/server/actions/generation'
import type { GeneratedFile } from '@/server/db/schema'

/**
 * The social kit: ready-to-post images and the identity as one document.
 *
 * Built around the logo the customer chose, which is why this is a separate
 * request rather than part of the first run — at that point nothing has been
 * chosen. The button says so when there is no choice yet, instead of failing
 * on press.
 */
export function SocialKit({
  projectId,
  posts,
  pdf,
  hasLogo,
  cost,
  creditBalance,
  isGenerating,
  mustVerify,
  userEmail,
  unlocked,
}: {
  projectId: string
  posts: GeneratedFile[]
  pdf: GeneratedFile | null
  hasLogo: boolean
  cost: number
  creditBalance: number
  isGenerating: boolean
  mustVerify: boolean
  userEmail: string
  /** Pro and above. Checked again in the action — this only decides the UI. */
  unlocked: boolean
}) {
  const t = useTranslations('Branding')
  const ts = useTranslations('Settings')

  const { executeAsync, isPending, result } = useAction(generateSocialKit)
  const affordable = creditBalance >= cost
  const busy = isPending || isGenerating

  async function start() {
    const outcome = await executeAsync({ projectId })
    // The kit takes minutes and arrives through the job, not this response —
    // a reload is what puts the page on the running job's stream.
    if (outcome?.data) window.location.reload()
  }

  const action = (
    <Button onClick={start} disabled={busy || !affordable || !hasLogo || mustVerify || !unlocked}>
      {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
      {posts.length ? t('kitRegenerate') : t('kitGenerate')}
    </Button>
  )

  return (
    <Disclosure
      title={t('kit')}
      meta={posts.length ? t('fileCount', { count: posts.length + (pdf ? 1 : 0) }) : undefined}
      open={posts.length > 0}
    >
      <p className="max-w-[68ch] text-sm text-fg-secondary">{t('kitHint')}</p>

      {posts.length > 0 && (
        <div className="mt-5 grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {posts.map((post) => (
            <figure key={post.id} className="space-y-2">
              {/* Generated assets are arbitrary user content, so next/image
                  optimisation is skipped in favour of a plain img. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/files/${post.id}`}
                alt={String(post.metadata?.label ?? t('kit'))}
                className="w-full rounded-control border border-line bg-white object-contain"
                loading="lazy"
              />
              <figcaption className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-medium">
                  {String(post.metadata?.label ?? '—')}
                </span>
                <a
                  href={`/api/files/${post.id}?download`}
                  className="inline-flex min-h-6 shrink-0 items-center text-xs accent-text hover:underline"
                >
                  {t('download')}
                </a>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {action}

        {pdf && (
          <a
            href={`/api/files/${pdf.id}?download`}
            className="inline-flex items-center gap-2 rounded-control border border-line px-3.5 py-2 text-sm transition-colors hover:bg-elevated"
          >
            <Download className="size-4" />
            {t('kitPdf')}
            <span className="text-xs text-fg-muted">
              {(pdf.sizeBytes / 1024 / 1024).toFixed(1)} MB
            </span>
          </a>
        )}
      </div>

      {/*
        Every reason the button might not work, said out loud.
        A disabled control with no explanation is the failure this product has
        already shipped twice.
      */}
      <div className="mt-3">
        {!unlocked ? (
          /*
           * Named rather than hidden. A section that simply vanishes on the
           * wrong plan teaches nobody that it exists — and this is the most
           * persuasive thing the product makes.
           */
          <p className="flex flex-wrap items-center gap-1.5 text-xs text-fg-muted">
            <Lock className="size-3.5" />
            {t('kitLocked')}{' '}
            <Link href="/dashboard/billing" className="accent-text underline underline-offset-2">
              {t('topUp')}
            </Link>
          </p>
        ) : mustVerify ? (
          <div className="rounded-control border border-warning/30 bg-warning/[0.07] p-4">
            <div className="flex items-start gap-3">
              <MailWarning className="mt-0.5 size-4 shrink-0 text-warning" />
              <div className="min-w-0">
                <p className="text-sm font-medium">{ts('unverifiedTitle')}</p>
                <p className="mt-1 text-sm text-fg-secondary">
                  {ts('unverifiedBody', { email: userEmail })}
                </p>
                <div className="mt-3.5">
                  <EmailVerification email={userEmail} />
                </div>
              </div>
            </div>
          </div>
        ) : !hasLogo ? (
          <p className="flex items-center gap-1.5 text-xs text-warning">
            <Images className="size-3.5" />
            {t('kitNeedsLogo')}
          </p>
        ) : busy ? (
          <p className="text-xs text-fg-muted">{t('kitRunning')}</p>
        ) : affordable ? (
          <p className="text-xs text-fg-muted">
            {t('kitCost', { credits: cost, balance: creditBalance })}
          </p>
        ) : (
          <p className="text-xs text-warning">
            {t('notEnoughCreditsHint', { credits: cost, balance: creditBalance })}{' '}
            <Link href="/dashboard/billing" className="underline underline-offset-2">
              {t('topUp')}
            </Link>
          </p>
        )}
      </div>

      <FieldError message={result?.serverError} />
    </Disclosure>
  )
}
