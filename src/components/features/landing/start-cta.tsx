import { ArrowRight } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { buttonVariants } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { getSession } from '@/server/session'

/**
 * The marketing pages' primary call to action.
 *
 * "Start free" is an invitation to sign up, and it was shown to everyone —
 * including people already signed in, for whom it is an offer they have taken.
 * Following it landed them on /register, which only bounces them back. Signed
 * in, the button carries them on to the dashboard instead.
 *
 * One component rather than the rule written at each call site: this page
 * alone has three of these, and a CTA that disagrees with itself between the
 * header and the fold is the kind of drift the plan ladder already had.
 *
 * It resolves the session on the server, so the right label is in the first
 * paint rather than swapped in after hydration. That makes the pages that use
 * it render per request.
 */
export async function StartCta({
  size,
  className,
}: {
  size?: 'sm' | 'lg'
  className?: string
}) {
  const t = await getTranslations('Landing')
  const session = await getSession()

  return (
    <Link
      href={session ? '/dashboard' : '/register'}
      className={cn(buttonVariants({ size, shape: 'pill' }), className)}
    >
      {session ? t('ctaDashboard') : t('ctaPrimary')}
      <ArrowRight className="size-4 rtl:rotate-180" />
    </Link>
  )
}
