import { getTranslations, setRequestLocale } from 'next-intl/server'

import { InvitationActions } from '@/components/features/settings/invitation-actions'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { Link } from '@/i18n/navigation'
import { db } from '@/server/db'
import { getInvitation, isMember } from '@/server/db/queries/members'
import { seatUsage } from '@/server/db/queries/plans'
import { organizations } from '@/server/db/schema'
import { getSession } from '@/server/session'
import { eq } from 'drizzle-orm'
import { redirect } from '@/i18n/navigation'

/**
 * Where an invitation email lands.
 *
 * Better Auth has been emailing this address since the organization plugin was
 * configured; the page never existed, so every invitation ever sent led to a
 * 404. It is deliberately outside `PROTECTED` in `proxy.ts` — the common case
 * is someone who has no account yet, and bouncing them to sign in without
 * telling them what they are signing in *for* is how an invitation gets
 * ignored.
 *
 * The invitation is read straight from the database rather than through
 * `auth.api.getInvitation`, which requires a session whose email matches. That
 * is exactly the signed-out case this page exists to serve.
 */
export default async function AcceptInvitationPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  setRequestLocale(locale)

  const t = await getTranslations('Team')
  const invitation = await getInvitation(id)

  /*
   * Anything not live gets one sentence and no detail. A bad id must not
   * confirm whether a workspace exists, or name it.
   */
  const live =
    invitation && invitation.status === 'pending' && invitation.expiresAt > new Date()

  if (!live) {
    return (
      <Shell>
        <CardTitle>{t('inviteInvalidTitle')}</CardTitle>
        <p className="mt-2 text-sm text-fg-secondary">{t('inviteInvalidBody')}</p>
        <Link href="/login" className={buttonVariants({ size: 'sm', className: 'mt-6' })}>
          {t('inviteSignIn')}
        </Link>
      </Shell>
    )
  }

  const [org] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, invitation.organizationId))
    .limit(1)

  const workspace = org?.name ?? t('inviteFallbackWorkspace')
  const inviter = invitation.inviterName || invitation.inviterEmail
  const session = await getSession()

  /* Already in. Nothing to accept, so go where they were trying to get. */
  if (session && (await isMember(invitation.organizationId, session.user.id))) {
    redirect({ href: '/dashboard', locale })
  }

  if (!session) {
    /*
     * Both routes carry the invitation back, and the email, so the account
     * they make is the one the invitation was addressed to — the accept
     * endpoint matches on it.
     */
    const back = `/${locale}/accept-invitation/${id}`
    const query = `?redirectTo=${encodeURIComponent(back)}&email=${encodeURIComponent(invitation.email)}`

    return (
      <Shell>
        <CardTitle>{t('inviteTitle', { workspace })}</CardTitle>
        <p className="mt-2 text-sm text-fg-secondary">{t('inviteBody', { inviter, workspace })}</p>
        <p className="mt-4 text-sm text-fg-muted">{t('inviteAddressedTo', { email: invitation.email })}</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/register${query}`} className={buttonVariants({ size: 'sm' })}>
            {t('inviteCreateAccount')}
          </Link>
          <Link
            href={`/login${query}`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            {t('inviteSignIn')}
          </Link>
        </div>
      </Shell>
    )
  }

  /*
   * Signed in as somebody else. The accept endpoint matches the address
   * exactly, so say whose invitation this is rather than letting them press a
   * button that will refuse them.
   */
  if (session.user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    return (
      <Shell>
        <CardTitle>{t('inviteWrongAccountTitle')}</CardTitle>
        <p className="mt-2 text-sm text-fg-secondary">
          {t('inviteWrongAccountBody', { invited: invitation.email, current: session.user.email })}
        </p>
        <Link
          href="/login"
          className={buttonVariants({ variant: 'outline', size: 'sm', className: 'mt-6' })}
        >
          {t('inviteSwitchAccount')}
        </Link>
      </Shell>
    )
  }

  /* The workspace filled up between the invitation and this moment. */
  const { seats, used } = await seatUsage(invitation.organizationId)
  if (used >= seats) {
    return (
      <Shell>
        <CardTitle>{t('inviteFullTitle')}</CardTitle>
        <p className="mt-2 text-sm text-fg-secondary">{t('inviteFullBody', { workspace })}</p>
      </Shell>
    )
  }

  return (
    <Shell>
      <CardTitle>{t('inviteTitle', { workspace })}</CardTitle>
      <p className="mt-2 text-sm text-fg-secondary">{t('inviteBody', { inviter, workspace })}</p>
      <InvitationActions invitationId={id} workspace={workspace} />
    </Shell>
  )
}

/** One centred card, so every state above reads as the same page. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    /* The other front door, and the one with the stronger case for daylight: a
       teammate opening an invitation link has never seen the landing page, so
       there is no marketing world here to be continuous with. */
    <div className="flex min-h-dvh items-center justify-center px-6 py-16">
      <main id="content" tabIndex={-1} className="w-full max-w-md">
        <Card>{children}</Card>
      </main>
    </div>
  )
}
