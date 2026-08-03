import { setRequestLocale } from 'next-intl/server'

import { KIT, PLANS, STEPS } from '@/components/features/landing/preview-data'
import { LogoMark } from '@/components/ui/logo'
import { Link } from '@/i18n/navigation'

/**
 * Direction B — The Apparatus.
 *
 * World: technical documentation for a machine. Blueprint rules, plate
 * numbers, tabular figures, a schematic of the pipeline drawn rather than
 * illustrated. The product is a manufacturing process, so the page is its
 * specification sheet.
 *
 * Premium here is precision and density: everything measured, nothing
 * decorative. Monospace is used for measurement only, which is the one thing
 * it is honest for.
 */
export default async function MachineDirection({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const rule = 'border-[#1e2a3f]'

  return (
    <div className="min-h-dvh bg-[#080d18] text-[#e8ecf5]">
      {/* Blueprint grid, drawn once behind everything at low contrast. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(#12203a 1px, transparent 1px), linear-gradient(90deg, #12203a 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(120% 90% at 50% 0%, black, transparent 75%)',
        }}
      />

      <div className="relative mx-auto max-w-[88rem] px-8">
        <header className={`flex items-center justify-between border-b ${rule} py-5`}>
          <span className="flex items-center gap-3">
            <LogoMark className="size-5" id="machine" />
            <span className="font-semibold tracking-[-0.02em]">Brandora</span>
          </span>
          <span className="hidden font-mono text-[11px] uppercase tracking-[0.2em] text-[#5f7396] md:block">
            Identity generation apparatus
          </span>
          <Link
            href="/register"
            className="border border-[#3b82f6] px-4 py-2 font-mono text-xs uppercase tracking-[0.16em] text-[#7cabff] transition-colors hover:bg-[#3b82f6] hover:text-white"
          >
            Start free
          </Link>
        </header>

        <section className={`grid border-b ${rule} py-24 lg:grid-cols-12 lg:py-32`}>
          <div className="lg:col-span-7">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#5f7396]">
              Input: one brief
            </p>
            <h1 className="mt-6 text-[clamp(2.8rem,7.5vw,6.5rem)] font-bold leading-[0.92] tracking-[-0.04em]">
              Sixty artifacts.
              <br />
              <span className="text-[#7cabff]">One decision.</span>
            </h1>
            <p className="mt-8 max-w-[46ch] text-lg leading-relaxed text-[#9fb0cc]">
              Every piece of an identity is derived from the same brand decision in the same
              run — which is why the site, the mark and the posts already agree with each
              other.
            </p>
          </div>

          {/* The schematic: the run drawn as a sequence of stages. */}
          <div className="mt-14 lg:col-span-5 lg:mt-0 lg:ps-12">
            <div className={`border ${rule} bg-[#0b1424]/70 p-6`}>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#5f7396]">
                Pipeline
              </p>
              <ol className="mt-5 space-y-0">
                {STEPS.map((step, index) => (
                  <li key={step.n} className="relative ps-8">
                    <span className="absolute start-0 top-1 flex size-4 items-center justify-center border border-[#3b82f6] font-mono text-[9px] text-[#7cabff]">
                      {index + 1}
                    </span>
                    {index < STEPS.length - 1 && (
                      <span className="absolute start-[7px] top-6 h-[calc(100%-1rem)] w-px bg-[#22406e]" />
                    )}
                    <p className="text-sm font-semibold">{step.n}</p>
                    <p className="mb-5 mt-1 text-xs leading-relaxed text-[#9fb0cc]">{step.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Output manifest, as a specification table. */}
        <section className={`border-b ${rule} py-16`}>
          <div className="flex items-baseline justify-between">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#5f7396]">
              Output manifest
            </h2>
            <span className="font-mono text-[11px] text-[#5f7396]">{KIT.length} classes</span>
          </div>

          <table className="mt-8 w-full border-collapse text-start">
            <tbody>
              {KIT.map((entry, index) => (
                <tr key={entry.item} className={`border-t ${rule}`}>
                  <td className="w-16 py-4 font-mono text-xs text-[#5f7396]">
                    {String(index + 1).padStart(2, '0')}
                  </td>
                  <td className="py-4 pe-6 text-base font-semibold sm:text-lg">{entry.item}</td>
                  <td className="py-4 text-sm text-[#9fb0cc]">{entry.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className={`border-b ${rule} py-16`}>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#5f7396]">
            Capacity and rates
          </h2>
          <div className="mt-8 grid gap-px bg-[#1e2a3f] sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan) => (
              <div key={plan.name} className="bg-[#080d18] p-6">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#5f7396]">
                  {plan.name}
                </p>
                <p className="mt-4 text-4xl font-bold tabular-nums tracking-[-0.03em]">
                  {plan.price === 0 ? 'Free' : `$${plan.price}`}
                </p>
                <p className="mt-3 font-mono text-xs text-[#7cabff]">{plan.credits}</p>
                <p className="mt-2 text-sm leading-relaxed text-[#9fb0cc]">{plan.note}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-6 py-24">
          <h2 className="text-[clamp(2rem,5vw,4rem)] font-bold leading-[0.95] tracking-[-0.04em]">
            Load a brief.
          </h2>
          <Link
            href="/register"
            className="border border-[#3b82f6] bg-[#3b82f6] px-8 py-4 font-mono text-xs uppercase tracking-[0.16em] text-white transition-opacity hover:opacity-90"
          >
            Start free
          </Link>
        </section>
      </div>
    </div>
  )
}
