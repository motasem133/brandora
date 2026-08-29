import { ArrowLeft } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'

import {
  ThresholdBand,
  ThresholdSpecimen,
  exampleSpecimen,
  type Specimen,
} from '@/components/features/auth/threshold-specimen'
import { Logo } from '@/components/ui/logo'
import { Link } from '@/i18n/navigation'
import { BRAND_COOKIE } from '@/lib/last-brand'

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
 * **What replaced the empty half is the product's own strongest move.** A 416px
 * card centred in 1440px of grey is the one composition this product cannot
 * defend: the page selling generated brand identities showed none, on the screen
 * every customer passes through. DESIGN.md answers what to put there without
 * being asked — *the colour belongs to the customer* — so above `lg` the other
 * half is a guest scope painted from a real brand's palette, carrying its mark,
 * its colours and the landing page's own two sentences set in its ink. One
 * decisive move, and everything around it stays chrome so the move is legible.
 *
 * It is not a metaphor and there is nothing to decode. There is no door, no
 * room and no wall — a specimen sits beside a form, which is what a visitor sees
 * whether or not anybody explains it.
 *
 * Below `lg` the screen is the form and only the form, because a phone's whole
 * viewport is barely the form. That is a composition decision rather than a
 * hidden-on-mobile shrug: at 390px the specimen would push `Create account`
 * under the fold, and the panel exists to be looked at, not scrolled past.
 *
 * The lockup rides in the header row rather than standing above the sheet, and
 * that was a trade rather than a tidy-up. At `size-20` over `text-4xl` it took
 * 112px before the form started, and on a 390x844 phone that pushed `Create
 * account` to 841px — the primary action of the product's own funnel landing
 * flush against the bottom edge, where it reads as the end of the page rather
 * than as a button with a sign-in link under it. Shrinking it bought that back;
 * moving it buys the room the band needs, on the one screen where the brand
 * that should be speaking is the customer's and not ours. A mark in the corner
 * of a sign-in page still says whose page it is.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('Auth')
  const tl = await getTranslations('Landing')

  /* Read once. The band and the panel are one subject at two widths, and
     resolving it twice would let a phone and a desktop disagree about whose
     brand this is. */
  const subject = await threshold(tl('sampleNotice'), t('lastBrand'))

  return (
    /*
      One column, until there is room for two. The form is first in the DOM and
      placed into the second column explicitly, so a screen reader reaches the
      sign-in box before the specimen rather than after two images and a claim —
      and grid puts each on the correct side in Arabic without a mirrored rule.
    */
    <div className="relative flex min-h-dvh flex-col lg:grid lg:grid-cols-[1fr_29rem] xl:grid-cols-[1fr_33rem]">
      {/* The way back to the page they came from. A sign-in screen with no exit
          is a trap for anyone who arrived at it by accident. */}
      <div className="relative z-10 flex items-center justify-between gap-4 px-6 pt-5 lg:col-start-2">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm text-fg-secondary transition-colors hover:bg-elevated hover:text-fg"
        >
          <ArrowLeft className="size-4 rtl:rotate-180" />
          {t('backHome')}
        </Link>

        <Link href="/" className="animate-fade-in shrink-0" aria-label="Brandora">
          <Logo className="text-xl" markClassName="size-10" animated />
        </Link>
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-8 lg:col-start-2 lg:row-start-2">
        {/* The specimen, at the size a single column can carry it. */}
        <ThresholdBand specimen={subject} />

        <main id="content" tabIndex={-1} className="animate-scale-in w-full max-w-[26rem]">
          {/* A sheet on the ground. It was a lit panel with its own source
              inside it, which only made sense while there was an arc behind the
              page for it to be sitting in. */}
          <div className="rounded-panel bg-surface p-7 shadow-[var(--shadow-lifted)] sm:p-8">
            {children}
          </div>
        </main>
      </div>

      <div className="lg:col-start-1 lg:row-span-2 lg:row-start-1">
        <ThresholdSpecimen specimen={subject} />
      </div>
    </div>
  )
}

/**
 * Whose brand the threshold shows.
 *
 * The last brand this browser was looking at, if it kept one, and the example
 * run otherwise. A returning customer is shown their own work rather than ours,
 * which is the difference between a page that argues and a page that recognises
 * you — and the only screen in the product where that distinction is available
 * before a session exists.
 *
 * Everything about the cookie is treated as hostile: it is read, parsed inside a
 * try, and every field is checked for the shape the panel will draw. A malformed
 * one falls through to the example, because a broken sign-in screen is a much
 * worse outcome than a generic one. It carries no authority — nothing here reads
 * the database or trusts the value beyond painting with it.
 */
async function threshold(sampleNotice: string, lastBrand: string): Promise<Specimen> {
  const example = exampleSpecimen(sampleNotice)

  const raw = (await cookies()).get(BRAND_COOKIE)?.value
  if (!raw) return example

  try {
    const kept = JSON.parse(decodeURIComponent(raw)) as Partial<Specimen>
    const palette = kept.palette

    if (typeof kept.name !== 'string' || !kept.name.trim() || !palette) return example
    /* A palette is five hexes or it is not a palette this can paint with. */
    for (const value of Object.values(palette)) {
      if (typeof value !== 'string' || !/^#[0-9a-f]{3,8}$/i.test(value)) return example
    }

    return {
      name: kept.name,
      palette,
      /* Only the two origins the product's own marks come from. Anything else
         in this field would be an arbitrary remote image, chosen by whatever
         wrote the cookie, rendered on the sign-in page. */
      logo:
        typeof kept.logo === 'string' && /^(https:\/\/[^/]+\/|\/api\/files\/)/.test(kept.logo)
          ? kept.logo
          : null,
      label: `${lastBrand} · ${kept.name}`,
    }
  } catch {
    return example
  }
}
