import { ArrowLeft } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { Logo } from '@/components/ui/logo'
import { SectionArc } from '@/components/ui/horizon'
import { Link } from '@/i18n/navigation'

/**
 * The threshold.
 *
 * These four screens sit between the marketing page and the app and used to
 * belong to neither: a mark, a form and nothing else, on flat ground, with the
 * light that carries the whole rest of the product switched off. Someone who
 * pressed "Start free" on the landing page fell out of its world into a
 * template and then back into the world again after signing in.
 *
 * So the arc rises here too, and the form sits in front of it in a lit panel —
 * the same composition as the reference's hero, at the scale of a single
 * decision. Dark in both themes, like the marketing pages and for the same
 * pinned reason: the brand is dark, and this is still the brand's own room
 * rather than the customer's workspace.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('Auth')

  return (
    <div className="world-dark relative flex min-h-dvh flex-col overflow-hidden">
      {/*
        Rising from the base of the screen, behind the panel. The section arc
        rather than the hero's: the hero's is scroll-driven and there is nothing
        to scroll here, and its crest is drawn at a scale that would put the
        brightest part of the light directly behind a 24px heading.
      */}
      <SectionArc className="bottom-0 top-auto translate-y-1/3" />

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
          {/*
            One lit panel, with its own source inside it. The bloom is centred
            on the base, where the arc behind the page is — so the panel reads
            as sitting in that light rather than as a box placed over it.
          */}
          <div className="lit shadow-[var(--shadow-lifted)] [--lit-radius:var(--radius-panel)]">
            <div className="lit-inner bloom p-7 sm:p-8 [--bloom-strength:14%]">{children}</div>
          </div>
        </main>
      </div>
    </div>
  )
}
