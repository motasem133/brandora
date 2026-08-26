import { ArrowLeft } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { Logo } from '@/components/ui/logo'
import { Link } from '@/i18n/navigation'

/**
 * The threshold.
 *
 * These four screens sit between the marketing page and the app, and they used
 * to belong to neither: a mark, a form and nothing else on flat ground, with the
 * light that carried the rest of the product switched off. Someone who pressed
 * "Start free" fell out of the landing page's world into a template and back
 * into a world again after signing in.
 *
 * The fix then was to give them the marketing world — the arc, the lit panel,
 * dark in both themes. The fix now is the other side of the same argument: they
 * get the *product's* world instead. Signing in is arriving at the workshop, not
 * a last page of the brochure, and a teammate opening an invitation link has no
 * marketing context to be continuous with — they have never seen the landing
 * page. The problem that comment was written about is still solved; the door now
 * opens onto the room it actually leads to.
 *
 * The arc goes with the change, for the reason it went everywhere else: a board
 * in daylight has no horizon to rise from.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('Auth')

  return (
    <div className="world-board relative flex min-h-dvh flex-col overflow-hidden">
      {/* The way back to the page they came from. A sign-in screen with no exit
          is a trap for anyone who arrived at it by accident. */}
      <div className="relative z-10 px-6 pt-6">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm text-fg-secondary transition-colors hover:bg-elevated hover:text-fg"
        >
          <ArrowLeft className="size-4 rtl:rotate-180" />
          {t('backHome')}
        </Link>
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-10">
        <Link href="/" className="animate-fade-in mb-8">
          <Logo className="text-4xl" markClassName="size-20" animated />
        </Link>

        <main id="content" tabIndex={-1} className="animate-scale-in w-full max-w-[26rem]">
          {/* A sheet on the board. It was a lit panel with its own source
              inside it, which only made sense while there was an arc behind the
              page for it to be sitting in. */}
          <div className="rounded-panel bg-surface p-7 shadow-[var(--shadow-lifted)] sm:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
