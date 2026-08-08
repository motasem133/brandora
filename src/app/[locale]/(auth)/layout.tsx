import { ArrowLeft } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { LogoMark } from '@/components/ui/logo'
import { Link } from '@/i18n/navigation'

/**
 * The endpapers.
 *
 * These four screens sit between the book and the app, and they have now been
 * wrong twice for the same reason: they were drawn for whichever world they
 * were next to at the time. First a bare form on flat ground with the product's
 * light switched off. Then a lit panel over a violet arc, because the marketing
 * pages were dark and the argument was that the brand is dark.
 *
 * The book abandoned that argument. What this product sells is printed matter,
 * and the page that says so is paper, so a visitor who presses "Start free" and
 * lands on near-black has been handed a different company's sign-in screen. The
 * form comes onto the same stock, in the same faces, framed as a plate: the
 * last leaf of the book rather than the first screen of the app.
 *
 * The discontinuity does not disappear, it moves. Past the sign-in the app is
 * still the dark navy workspace at `:root`, and that is honest: the book is
 * what you are buying, the workspace is where you work. Better one seam at the
 * door than one in the middle of the shop window.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('Auth')

  return (
    <div className="world-paper relative flex min-h-dvh flex-col overflow-hidden">
      {/* The way back to the page they came from. A sign-in screen with no exit
          is a trap for anyone who arrived at it by accident. */}
      <div className="relative z-10 px-6 pt-6">
        <Link
          href="/"
          className="type-runhead inline-flex min-h-11 items-center gap-2 transition-colors hover:!text-fg"
        >
          <ArrowLeft className="size-4 rtl:rotate-180" />
          {t('backHome')}
        </Link>
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-10">
        {/* The same lockup the running head carries, at the size a title page
            sets it. The gradient wordmark that stood here is the app's mark on
            a dark ground; on paper it was the one lit object left in the
            frame. */}
        <Link href="/" className="animate-fade-in mb-10 flex items-center gap-3">
          <LogoMark className="size-10" />
          <span className="type-plate-sm">Brandora</span>
        </Link>

        <main id="content" tabIndex={-1} className="animate-scale-in w-full max-w-[26rem]">
          {/*
            One plate on the page. The lit panel it replaces carried its own
            light source inside it, which is the right object on a dark ground
            and a glowing box on a pale one. A sheet needs no light of its own:
            a hairline for its cut edge and a short shadow down-page, the same
            `plate` every specimen in the book is mounted on.
          */}
          <div className="plate bg-elevated p-7 sm:p-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
