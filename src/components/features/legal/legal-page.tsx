import { getTranslations } from 'next-intl/server'

import { StartCta } from '@/components/features/landing/start-cta'
import { buttonVariants } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import type { LegalDocument } from '@/content/legal'
import { getSession } from '@/server/session'

/**
 * One page shape for the two documents nobody reads until they need to.
 *
 * Set in the marketing world rather than the app's, because that is where a
 * visitor is when they check whether a product can be trusted with a card —
 * and because Google will not verify an OAuth consent screen against a policy
 * behind a login.
 *
 * A measure of about 68 characters and a heading hierarchy that survives being
 * skimmed. Legal text is read by search, not by sentence: somebody arrives
 * looking for the word "refund" or the word "delete", and the job of the page
 * is to make that word findable.
 */
export async function LegalPage({ doc }: { doc: LegalDocument }) {
  const t = await getTranslations('Nav')
  const session = await getSession()

  return (
    <div className="world-dark min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="font-display text-xl font-bold accent-text">
          Brandora
        </Link>
        <nav className="flex items-center gap-2">
          {!session && (
            <Link href="/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
              {t('signIn')}
            </Link>
          )}
          <StartCta size="sm" />
        </nav>
      </header>

      <main id="content" tabIndex={-1} className="mx-auto max-w-3xl px-6 pb-24">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">{doc.title}</h1>
        <p className="mt-2 text-sm text-fg-muted">{doc.updated}</p>

        <p className="mt-6 max-w-[68ch] text-fg-secondary">{doc.intro}</p>

        {doc.governingLanguage && (
          /* Which version wins, said on the translated one rather than buried
             at the end of both. */
          <p className="mt-4 rounded-control border border-line bg-surface/60 px-4 py-3 text-sm text-fg-muted">
            {doc.governingLanguage}
          </p>
        )}

        <div className="mt-12 space-y-10">
          {doc.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-display text-xl font-semibold">{section.heading}</h2>
              <div className="mt-3 space-y-3">
                {section.body.map((paragraph, index) => (
                  <p key={index} className="max-w-[68ch] text-fg-secondary">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div aria-hidden className="rule-fade my-12" />

        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-label={doc.title}>
          <Link href="/privacy" className="text-fg-secondary transition-colors hover:text-white">
            {t('privacy')}
          </Link>
          <Link href="/terms" className="text-fg-secondary transition-colors hover:text-white">
            {t('terms')}
          </Link>
          <a
            href="mailto:hello@enigmitic.com"
            className="text-fg-secondary transition-colors hover:text-white"
          >
            hello@enigmitic.com
          </a>
        </nav>
      </main>
    </div>
  )
}
