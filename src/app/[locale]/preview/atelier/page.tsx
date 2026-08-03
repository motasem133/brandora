import { setRequestLocale } from 'next-intl/server'

import { KIT, PLANS, STEPS } from '@/components/features/landing/preview-data'
import { LogoMark } from '@/components/ui/logo'
import { Link } from '@/i18n/navigation'

/**
 * Direction C — The Atelier.
 *
 * World: a design studio's wall. Warm paper, a serif display voice, work
 * pinned up and annotated in the margin, the deliverables treated as objects
 * on a table rather than as features in a grid.
 *
 * Premium here is materiality and editorial pacing — the register of a
 * monograph, not of a SaaS page. It is the furthest of the three from the
 * category default, and the most dependent on the copy carrying weight.
 */
export default async function AtelierDirection({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <div className="min-h-dvh bg-[#f3efe7] text-[#1a1713]">
      {/* Paper: a fine warm grain, low enough to read as stock rather than noise. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.5] mix-blend-multiply"
        style={{
          backgroundImage:
            'radial-gradient(#d9cfbe 0.5px, transparent 0.5px), radial-gradient(#e6dccb 0.5px, transparent 0.5px)',
          backgroundSize: '14px 14px, 22px 22px',
          backgroundPosition: '0 0, 7px 11px',
        }}
      />

      <div className="relative mx-auto max-w-[80rem] px-8">
        <header className="flex items-center justify-between py-8">
          <span className="flex items-center gap-3">
            <LogoMark className="size-5" id="atelier" />
            <span className="font-semibold tracking-[-0.01em]">Brandora</span>
          </span>
          <Link
            href="/register"
            className="rounded-full border border-[#1a1713] px-5 py-2 text-sm font-medium transition-colors hover:bg-[#1a1713] hover:text-[#f3efe7]"
          >
            Start free
          </Link>
        </header>

        <section className="grid gap-12 py-16 lg:grid-cols-12 lg:py-24">
          <div className="lg:col-span-7">
            {/* The display voice is a serif at a size a studio would set it. */}
            <h1
              className="text-[clamp(3rem,8vw,7rem)] leading-[0.94] tracking-[-0.03em]"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              Every studio
              <br />
              starts the same
              <br />
              <em className="italic text-[#8a5a2b]">way — a brief.</em>
            </h1>
          </div>

          <div className="lg:col-span-5 lg:pt-10">
            <p className="max-w-[40ch] text-lg leading-[1.7] text-[#4a4239]">
              Ours takes eight questions and returns the work a studio would spend a month on:
              the names and why, the marks, the palette, the type, the voice, the site, the
              posts. Then you tell it what to change, the way you would tell a designer.
            </p>

            <p className="mt-8 text-sm uppercase tracking-[0.2em] text-[#8a7a66]">
              Ten deliverables, one run
            </p>
          </div>
        </section>

        {/* The table: deliverables as objects, laid out in two columns of margin notes. */}
        <section className="border-t border-[#d5cbb9] py-16">
          <div className="grid gap-x-16 gap-y-10 sm:grid-cols-2">
            {KIT.map((entry) => (
              <div key={entry.item} className="flex gap-5">
                <span className="mt-2.5 h-px w-8 shrink-0 bg-[#8a5a2b]" />
                <div>
                  <p
                    className="text-2xl leading-tight tracking-[-0.02em]"
                    style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                  >
                    {entry.item}
                  </p>
                  <p className="mt-1.5 text-[#4a4239]">{entry.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-[#d5cbb9] py-16">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((step, index) => (
              <div key={step.n}>
                <p className="text-sm text-[#8a7a66]">{String(index + 1).padStart(2, '0')}</p>
                <p
                  className="mt-2 text-2xl tracking-[-0.02em]"
                  style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                >
                  {step.n}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#4a4239]">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-[#d5cbb9] py-16">
          <h2
            className="text-4xl tracking-[-0.02em]"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            What it costs
          </h2>

          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan) => (
              <div key={plan.name} className="border-t-2 border-[#1a1713] pt-5">
                <p className="text-sm uppercase tracking-[0.18em] text-[#8a7a66]">{plan.name}</p>
                <p
                  className="mt-3 text-5xl tracking-[-0.03em]"
                  style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                >
                  {plan.price === 0 ? 'Free' : `$${plan.price}`}
                </p>
                <p className="mt-3 text-sm text-[#4a4239]">{plan.credits}</p>
                <p className="text-sm text-[#4a4239]">{plan.note}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-wrap items-end justify-between gap-8 border-t border-[#d5cbb9] py-24">
          <h2
            className="text-[clamp(2.5rem,6vw,5rem)] leading-[0.95] tracking-[-0.03em]"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            Bring the brief.
            <br />
            <em className="italic text-[#8a5a2b]">We will bring the rest.</em>
          </h2>
          <Link
            href="/register"
            className="rounded-full bg-[#1a1713] px-8 py-4 text-sm font-medium text-[#f3efe7] transition-opacity hover:opacity-90"
          >
            Start free
          </Link>
        </section>
      </div>
    </div>
  )
}
