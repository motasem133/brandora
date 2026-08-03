import { setRequestLocale } from 'next-intl/server'

import { KIT, PLANS, STEPS } from '@/components/features/landing/preview-data'
import { LogoMark } from '@/components/ui/logo'
import { Link } from '@/i18n/navigation'

/**
 * Direction A — The Identity Manual.
 *
 * World: the printed brand-standards manual. Swiss grid, hairline rules,
 * numbered specimen pages, ink on paper, one accent used sparingly. The
 * argument is made by demonstration: a company that hands you a brand system
 * should be able to show you it understands what one is.
 *
 * No gradient, no glow, no cards. Premium here is typographic craft and
 * restraint, which is the opposite of the AI-tool costume.
 */
export default async function ManualDirection({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <div
      className="min-h-dvh bg-[#faf9f6] text-[#12100e]"
      style={{ fontFeatureSettings: "'ss01'" }}
    >
      <header className="mx-auto flex max-w-[92rem] items-baseline justify-between border-b border-[#12100e] px-8 py-5">
        <span className="flex items-baseline gap-3">
          <LogoMark className="size-5 translate-y-0.5" id="manual" />
          <span className="text-lg font-bold tracking-[-0.02em]">Brandora</span>
        </span>
        <span className="hidden text-xs uppercase tracking-[0.24em] text-[#6b655c] sm:block">
          Brand identity, generated
        </span>
        <Link href="/register" className="text-sm font-semibold underline underline-offset-4">
          Start free
        </Link>
      </header>

      {/* The specimen page: one enormous statement, set like a title page. */}
      <section className="mx-auto max-w-[92rem] px-8">
        <div className="grid border-b border-[#12100e] py-20 lg:grid-cols-12 lg:py-32">
          <div className="lg:col-span-8">
            <h1 className="text-[clamp(3rem,9vw,8.5rem)] font-bold leading-[0.86] tracking-[-0.045em]">
              A brand is
              <br />
              not a logo.
            </h1>
          </div>
          <div className="mt-10 lg:col-span-4 lg:mt-2 lg:ps-8">
            <p className="max-w-[38ch] text-lg leading-[1.6] text-[#3b352d]">
              It is a name, a mark, a palette, a typeface, a voice, a website and a hundred
              decisions that have to agree with each other. Brandora makes all of them in one
              run, from one brief, so they do.
            </p>
            <Link
              href="/register"
              className="mt-8 inline-block bg-[#12100e] px-7 py-4 text-sm font-semibold text-[#faf9f6] transition-colors hover:bg-[#2f2a24]"
            >
              Start free — no card
            </Link>
          </div>
        </div>

        {/* The contents page. Ten deliverables, set as a manual's index. */}
        <div className="grid gap-x-16 border-b border-[#12100e] py-16 lg:grid-cols-12">
          <h2 className="text-xs uppercase tracking-[0.24em] text-[#6b655c] lg:col-span-3">
            What one run delivers
          </h2>
          <ol className="lg:col-span-9">
            {KIT.map((entry, index) => (
              <li
                key={entry.item}
                className="grid grid-cols-[3rem_1fr] items-baseline gap-4 border-t border-[#d8d3c8] py-5 first:border-t-0 sm:grid-cols-[4rem_18rem_1fr]"
              >
                <span className="text-sm tabular-nums text-[#a39c90]">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="text-xl font-semibold tracking-[-0.02em]">{entry.item}</span>
                <span className="col-span-2 text-[#3b352d] sm:col-span-1">{entry.detail}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* The process, as a manual's numbered plates. */}
        <div className="grid gap-x-16 border-b border-[#12100e] py-16 lg:grid-cols-12">
          <h2 className="text-xs uppercase tracking-[0.24em] text-[#6b655c] lg:col-span-3">
            How it runs
          </h2>
          <div className="grid gap-10 lg:col-span-9 lg:grid-cols-5">
            {STEPS.map((step) => (
              <div key={step.n}>
                <p className="border-t-2 border-[#12100e] pt-3 text-lg font-semibold">{step.n}</p>
                <p className="mt-2 text-sm leading-relaxed text-[#3b352d]">{step.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing as a rate card, not as four glowing boxes. */}
        <div className="grid gap-x-16 border-b border-[#12100e] py-16 lg:grid-cols-12">
          <h2 className="text-xs uppercase tracking-[0.24em] text-[#6b655c] lg:col-span-3">
            Rates
          </h2>
          <div className="lg:col-span-9">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className="grid grid-cols-2 items-baseline gap-4 border-t border-[#d8d3c8] py-6 first:border-t-0 sm:grid-cols-[10rem_1fr_auto]"
              >
                <span className="text-2xl font-bold tracking-[-0.03em]">{plan.name}</span>
                <span className="col-span-2 text-sm text-[#3b352d] sm:col-span-1">
                  {plan.credits} · {plan.note}
                </span>
                <span className="text-2xl font-bold tabular-nums tracking-[-0.03em]">
                  {plan.price === 0 ? 'Free' : `$${plan.price}`}
                  {plan.price > 0 && (
                    <span className="ms-1 text-sm font-normal text-[#6b655c]">/mo</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-6 py-20">
          <p className="text-[clamp(2rem,5vw,4rem)] font-bold leading-[0.95] tracking-[-0.04em]">
            Bring a brief.
          </p>
          <Link
            href="/register"
            className="bg-[#12100e] px-8 py-4 text-sm font-semibold text-[#faf9f6] transition-colors hover:bg-[#2f2a24]"
          >
            Start free
          </Link>
        </div>
      </section>
    </div>
  )
}
