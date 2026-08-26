'use client'

import { Download, Images, Loader2, MailWarning, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAction } from 'next-safe-action/hooks'

import { EmptyPin } from '@/components/features/projects/empty-pin'
import { CompareShelf } from '@/components/ui/compare-shelf'
import { EmailVerification } from '@/components/features/settings/email-verification'
import { Button } from '@/components/ui/button'
import { Disclosure } from '@/components/ui/disclosure'
import { FieldError } from '@/components/ui/field-error'
import { Link, useRouter } from '@/i18n/navigation'
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
  /** Creator and above. Checked again in the action — this only decides the UI. */
  unlocked: boolean
  /**
   * The kit drawn in this brand, for a plan that cannot make one.
   *
   * Passed in rather than rendered here: it is a server component, and naming
   * what is missing without showing it is the half-measure this replaces.
   */
}) {
  const t = useTranslations('Branding')
  const ts = useTranslations('Settings')
  const tg = useTranslations('Generation')
  const router = useRouter()

  const { executeAsync, isPending, result } = useAction(generateSocialKit)
  const affordable = creditBalance >= cost
  const busy = isPending || isGenerating

  async function start() {
    const outcome = await executeAsync({ projectId })
    /* The kit takes minutes and arrives through the job, not this response, so
       the page has to re-read the project to find it queued and open the run's
       stream. A refresh does that; it used to be a full reload, because a
       Suspense boundary on this page stopped soft updates from committing. */
    if (outcome?.data) router.refresh()
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
      /* Open when there is something to see — and when there is not, because
         the plan is the reason: a locked section folded shut teaches nothing. */
      open={posts.length > 0 || !unlocked}
    >
      <p className="max-w-[68ch] text-sm text-fg-secondary">{t('kitHint')}</p>

      {posts.length > 0 && (
        /*
          The kit is where the product's first principle gets tested: it must
          agree with itself. A grid of thumbnails proves eight files exist and
          answers nothing about whether the third and the seventh look like the
          same brand — the shelf lets a customer put any two next to each other
          at a size worth judging, which is the only way that question gets
          answered.

          Downloads left the tile with it. They were a link under every image
          competing with the image for the press, and the whole set is one ZIP
          on the button below — the place someone actually goes for the files.
        */
        <CompareShelf
          className="mt-5"
          items={posts.map((post) => ({
            id: post.id,
            src: `/api/files/${post.id}`,
            label: String(post.metadata?.label ?? t('kit')),
          }))}
          compareLabel={t('compare')}
          compareHint={t('compareHint')}
          holdLabel={(what) => t('holdUp', { what })}
        />
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
           * A frame with its pin in, not a locked preview.
           *
           * Named rather than hidden is still the rule — a section that vanishes
           * on the wrong plan teaches nobody it exists. What changed is what
           * "named" looks like: the mockup and the lock line argued for eleven
           * days and converted nobody, so the gap is drawn as a gap instead.
           */
          <EmptyPin
            title={tg('locked.kit.title')}
            benefit={tg('locked.kit.benefit')}
            action={t('pinHang')}
            caption={t('kit')}
            meta={t('pinCredits', { credits: cost })}
            price={t('kitLocked')}
          />
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
                  {/* Blocking, so it sends a code if none is live — see the panel. */}
                  <EmailVerification email={userEmail} autoSend />
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
