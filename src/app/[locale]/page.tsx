import { ArrowRight, Check } from 'lucide-react'
import { setRequestLocale } from 'next-intl/server'
import Image from 'next/image'

import { HeroBadge } from '@/components/features/landing/float'
import { PaletteDeal, PillFan, StepMark } from '@/components/features/landing/flourish'
import {
  Cell,
  Horizon,
  LightSweep,
  SectionArc,
  ProductFrame,
  SectionReveal,
} from '@/components/features/landing/horizon'
import { AfterHeadline, HeadlineWords } from '@/components/features/landing/motion-hero'
import { PLANS, STEPS } from '@/components/features/landing/landing-data'
import { LogoMark } from '@/components/ui/logo'
import { MomentumField, MomentumItem } from '@/components/ui/momentum'
import { Link } from '@/i18n/navigation'

/**
 * Direction D — Horizon.
 *
 * Built to the reference the client supplied: near-black ground, a centred
 * column, and a light source rising behind the fold with the product framed in
 * front of it. The arc is the page's whole visual argument, so it is drawn
 * rather than illustrated — a gradient ring, bloomed, cropped by the section.
 *
 * The reference's customer logo wall is deliberately absent: there are no
 * customers yet, and inventing a "trusted by" row is the one thing on that
 * page we cannot honestly copy.
 */
/** Real files from a completed run, used as the deliverable specimens. */
const LOGOS = [
  '/marketing/makan-wordmark.webp',
  '/marketing/makan-lettermark-monogram.webp',
  '/marketing/makan-mark.webp',
  '/marketing/makan-emblem-badge.webp',
]

const PALETTE = ['#6F4E37', '#D4A574', '#C08552', '#FAF6F0', '#2D1B0E']

const REST = [
  'Brand story',
  'Brand voice',
  'Brand values',
  'Social kit — 9 posts',
  'Bios and hashtags',
  'Ad copy',
  'Favicon',
  'Avatars',
  'OG card',
  'Brand kit ZIP',
]

export default async function HorizonDirection({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#05070f] text-white">
      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-8 py-6">
        <span className="flex items-center gap-2.5">
          <LogoMark className="size-6" id="horizon" />
          <span className="font-semibold tracking-[-0.01em]">Brandora</span>
        </span>

        <nav className="hidden items-center gap-8 text-sm text-white/60 md:flex">
          <a href="#kit" className="transition-colors hover:text-white">
            What you get
          </a>
          <a href="#how" className="transition-colors hover:text-white">
            How it works
          </a>
          <a href="#pricing" className="transition-colors hover:text-white">
            Pricing
          </a>
        </nav>

        <Link
          href="/register"
          className="inline-flex items-center gap-2 rounded-full bg-[image:linear-gradient(100deg,#7C3AED,#4F46E5_55%,#3B82F6)] px-5 py-2.5 text-sm font-semibold shadow-[0_0_28px_-6px_#4F46E5] transition-transform duration-200 hover:scale-[1.03]"
        >
          Start free
          <ArrowRight className="size-4 rtl:rotate-180" />
        </Link>
      </header>

      {/* ------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden pb-0 pt-14 text-center sm:pt-20">
        <Horizon />

        <div className="relative z-10 mx-auto max-w-4xl px-8">
          <HeroBadge>
            <span className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] py-1 pe-4 ps-1 text-sm backdrop-blur">
              <span className="rounded-full bg-[image:linear-gradient(100deg,#7C3AED,#3B82F6)] px-3 py-1 text-xs font-semibold">
                One run
              </span>
              <span className="text-white/70">Ten deliverables, not a logo</span>
            </span>
          </HeroBadge>

          <div className="mt-8">
            <HeadlineWords
              text="Your entire brand identity,"
              className="text-[clamp(2.6rem,6.2vw,4.6rem)] font-bold leading-[1.05] tracking-[-0.035em]"
            />
            <AfterHeadline delay={0.3}>
              <p className="text-[clamp(2.6rem,6.2vw,4.6rem)] font-bold leading-[1.05] tracking-[-0.035em] text-white/45">
                generated in one run.
              </p>
            </AfterHeadline>
          </div>

          <AfterHeadline delay={0.5}>
            <p className="mx-auto mt-7 max-w-[52ch] text-lg leading-relaxed text-white/55">
              Names, logos, palette, typography, a brand story, a live website and a social kit —
              all decided together, so they agree with each other.
            </p>
          </AfterHeadline>

          <AfterHeadline delay={0.62}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/pricing"
                className="rounded-full border border-white/12 bg-white/[0.06] px-6 py-3 text-sm font-medium backdrop-blur transition-colors hover:bg-white/[0.12]"
              >
                See pricing
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full bg-[image:linear-gradient(100deg,#7C3AED,#4F46E5_55%,#3B82F6)] px-6 py-3 text-sm font-semibold shadow-[0_0_40px_-8px_#4F46E5] transition-transform duration-200 hover:scale-[1.03]"
              >
                Start free
                <ArrowRight className="size-4 rtl:rotate-180" />
              </Link>
            </div>
          </AfterHeadline>
        </div>

        {/* The product, framed in front of the light and cropped by the fold. */}
        <div className="relative z-10 mx-auto mt-28 max-w-6xl px-8 sm:mt-36">
          <ProductFrame>
            <div className="rounded-t-[1.75rem] border border-white/10 bg-white/[0.03] p-2 shadow-[0_-10px_80px_-20px_rgba(99,102,241,0.6)] backdrop-blur">
              <Image
                src="/marketing/app-dashboard.webp"
                alt="The Brandora dashboard"
                width={1600}
                height={1000}
                className="w-full rounded-t-[1.35rem]"
                sizes="(max-width: 1024px) 100vw, 1100px"
                priority
              />
            </div>
          </ProductFrame>
        </div>
      </section>

      {/* -------------------------------------------------------------- kit */}
      <section id="kit" className="relative overflow-hidden border-t border-white/[0.06] bg-[#070a14]">
        <SectionArc className="top-0" />
        <LightSweep />
        <div className="relative z-10 mx-auto max-w-7xl px-8 py-28">
          <SectionReveal>
            <h2 className="max-w-2xl text-[clamp(2rem,4vw,3.2rem)] font-bold leading-[1.08] tracking-[-0.03em]">
              One brief in.
              <span className="text-white/45"> Everything a brand needs out.</span>
            </h2>
          </SectionReveal>

          {/*
            The deliverables are shown, not listed. Ten identical cells told the
            visitor a count; these tiles hand over the actual artifacts a run
            produced, sized by how much looking each one rewards.
          */}
          <div className="mt-16 grid auto-rows-[13rem] grid-cols-2 gap-4 lg:grid-cols-4">
            {/*
              The one place on the page a visitor can put a hand on the output,
              so it is the one place that answers back individually. The old
              behaviour scaled all four whenever the cell was hovered, which
              told you the cell was hoverable and nothing about the logos.
            */}
            <Cell index={0} className="col-span-2 row-span-2" lift={false}>
              <div className="relative h-full rounded-2xl bg-[image:linear-gradient(180deg,rgba(167,139,250,0.35),rgba(255,255,255,0.04)_38%)] p-px">
                <div className="flex h-full flex-col rounded-[calc(1rem-1px)] bg-[#080c16] p-7">
                  <p className="text-sm text-white/45">Four logo concepts</p>
                  <MomentumField className="mt-5 grid flex-1 grid-cols-2 gap-3">
                    {LOGOS.map((logo) => (
                      <MomentumItem key={logo} throwGain={0.4} spinGain={0.09}>
                        <div className="h-full overflow-hidden rounded-xl bg-white/95">
                          <Image
                            src={logo}
                            alt="A logo concept generated by Brandora"
                            width={720}
                            height={720}
                            className="size-full object-contain p-2"
                            sizes="160px"
                          />
                        </div>
                      </MomentumItem>
                    ))}
                  </MomentumField>
                  <p className="mt-4 text-xs text-white/35">PNG and traced SVG, plus favicon and avatars</p>
                </div>
              </div>
            </Cell>

            <Cell index={1} className="col-span-2">
              <div className="h-full rounded-2xl bg-[image:linear-gradient(180deg,rgba(167,139,250,0.28),rgba(255,255,255,0.04)_38%)] p-px">
                <div className="flex h-full flex-col rounded-[calc(1rem-1px)] bg-[#080c16] p-7">
                  <p className="text-sm text-white/45">Colour palette</p>
                  <PaletteDeal colors={PALETTE} className="mt-5 flex flex-1 gap-2" />
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-white/35">
                    {PALETTE.map((hex) => (
                      <span key={hex}>{hex}</span>
                    ))}
                  </div>
                </div>
              </div>
            </Cell>

            <Cell index={2}>
              <div className="h-full rounded-2xl bg-[image:linear-gradient(180deg,rgba(167,139,250,0.28),rgba(255,255,255,0.04)_38%)] p-px">
                <div className="flex h-full flex-col justify-between rounded-[calc(1rem-1px)] bg-[#080c16] p-7">
                  <p className="text-sm text-white/45">Names, with reasoning</p>
                  <div>
                    <p className="text-2xl font-semibold tracking-[-0.02em]">Makān</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-white/40">
                      Arabic for &ldquo;place&rdquo; — a space to think and find clarity.
                    </p>
                  </div>
                </div>
              </div>
            </Cell>

            <Cell index={3}>
              <div className="h-full rounded-2xl bg-[image:linear-gradient(180deg,rgba(167,139,250,0.28),rgba(255,255,255,0.04)_38%)] p-px">
                <div className="flex h-full flex-col justify-between rounded-[calc(1rem-1px)] bg-[#080c16] p-7">
                  <p className="text-sm text-white/45">Typography</p>
                  <div>
                    <p className="text-3xl font-semibold tracking-[-0.03em]">Sora</p>
                    <p className="text-sm text-white/50">Inter · DM Serif Display</p>
                  </div>
                </div>
              </div>
            </Cell>

            <Cell index={4} className="col-span-2">
              <div className="group h-full overflow-hidden rounded-2xl bg-[image:linear-gradient(180deg,rgba(167,139,250,0.3),rgba(255,255,255,0.04)_38%)] p-px">
                <div className="relative h-full overflow-hidden rounded-[calc(1rem-1px)] bg-[#080c16]">
                  <Image
                    src="/marketing/makan-website.webp"
                    alt="A website generated and published by Brandora"
                    width={1200}
                    height={806}
                    className="size-full object-cover object-top opacity-80 transition-transform duration-500 group-hover:scale-[1.03]"
                    sizes="(max-width: 1024px) 100vw, 560px"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-[image:linear-gradient(0deg,#080c16,transparent)] p-6 pt-16">
                    <p className="text-sm font-semibold">A published website</p>
                    <p className="text-xs text-white/45">multi-page, editable, on its own address</p>
                  </div>
                </div>
              </div>
            </Cell>

            <Cell index={5} className="col-span-2">
              <div className="h-full rounded-2xl bg-[image:linear-gradient(180deg,rgba(167,139,250,0.28),rgba(255,255,255,0.04)_38%)] p-px">
                <div className="flex h-full flex-col justify-between rounded-[calc(1rem-1px)] bg-[#080c16] p-7">
                  <p className="text-sm text-white/45">And the rest of it</p>
                  <PillFan items={REST} className="flex flex-wrap gap-2" />
                </div>
              </div>
            </Cell>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- how */}
      <section id="how" className="relative overflow-hidden border-t border-white/[0.06]">
        <SectionArc className="top-0" />
        <div className="relative z-10 mx-auto max-w-5xl px-8 py-28">
          <SectionReveal>
            <h2 className="text-[clamp(2rem,4vw,3.2rem)] font-bold tracking-[-0.03em]">
              How a run works
            </h2>
          </SectionReveal>

          {/*
            A descent rather than five columns: the run happens in sequence, and
            a row of equal boxes said nothing about order. The rail carries the
            eye down it, and each stage states what it produces.
          */}
          <ol className="relative mt-16">
            <div
              aria-hidden
              className="absolute bottom-8 start-[1.55rem] top-4 w-px"
              style={{
                background:
                  'linear-gradient(180deg, rgba(167,139,250,0.7), rgba(96,165,250,0.5), transparent)',
              }}
            />

            {STEPS.map((step, index) => (
              <Cell key={step.n} index={index}>
                <li className="relative grid grid-cols-[3.5rem_1fr] items-start gap-x-6 pb-14 last:pb-0">
                  <StepMark
                    index={index}
                    className="relative z-10 flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-[#0a0f1c] text-lg font-semibold shadow-[0_0_34px_-8px_rgba(139,92,246,0.9)]"
                  >
                    {index + 1}
                  </StepMark>

                  <div className="pt-2.5">
                    <p className="text-2xl font-semibold tracking-[-0.02em]">{step.n}</p>
                    <p className="mt-2 max-w-[58ch] leading-relaxed text-white/45">{step.body}</p>
                  </div>
                </li>
              </Cell>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------------------------------------------------- pricing */}
      <section id="pricing" className="relative overflow-hidden border-t border-white/[0.06] bg-[#070a14]">
        <SectionArc className="top-0" />

        <div className="relative z-10 mx-auto max-w-7xl px-8 py-28">
          <SectionReveal>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <h2 className="text-[clamp(2rem,4vw,3.2rem)] font-bold tracking-[-0.03em]">Pricing</h2>
              <p className="max-w-[42ch] text-white/50">
                Every plan generates the full identity. What changes is how many brands you can
                run, and where the site can live.
              </p>
            </div>
          </SectionReveal>

          <div className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan, index) => {
              const featured = index === 2

              return (
                <Cell key={plan.name} index={index}>
                  <div
                    className={
                      featured
                        ? 'relative h-full rounded-3xl bg-[image:linear-gradient(160deg,#7C3AED,#4F46E5_55%,#3B82F6)] p-px shadow-[0_0_70px_-20px_#4F46E5]'
                        : 'h-full rounded-3xl bg-[image:linear-gradient(180deg,rgba(167,139,250,0.28),rgba(255,255,255,0.05)_40%)] p-px'
                    }
                  >
                    <div className="flex h-full flex-col rounded-[calc(1.5rem-1px)] bg-[#080c16] p-7">
                      {featured && (
                        <span className="absolute -top-3 end-6 rounded-full bg-[image:linear-gradient(100deg,#7C3AED,#3B82F6)] px-3 py-1 text-[11px] font-semibold">
                          Most chosen
                        </span>
                      )}

                      <p className="text-sm text-white/50">{plan.name}</p>

                      <p className="mt-4 flex items-baseline gap-1.5">
                        <span className="text-5xl font-bold tracking-[-0.04em]">
                          {plan.price === 0 ? 'Free' : `$${plan.price}`}
                        </span>
                        {plan.price > 0 && (
                          <span className="text-sm text-white/40">/month</span>
                        )}
                      </p>

                      {/* The number that actually decides the plan. */}
                      <p className="mt-5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm">
                        <span className="font-semibold">{plan.runs}</span>
                        <span className="text-white/40"> · {plan.credits}</span>
                      </p>

                      <ul className="mt-6 flex-1 space-y-3">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2.5 text-sm">
                            <Check className="mt-0.5 size-4 shrink-0 text-[#a78bfa]" />
                            <span className="text-white/65">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <Link
                        href="/register"
                        className={
                          featured
                            ? 'mt-8 flex items-center justify-center rounded-full bg-[image:linear-gradient(100deg,#7C3AED,#3B82F6)] py-3 text-sm font-semibold transition-transform duration-200 hover:scale-[1.02]'
                            : 'mt-8 flex items-center justify-center rounded-full border border-white/12 bg-white/[0.05] py-3 text-sm font-medium transition-colors hover:bg-white/[0.12]'
                        }
                      >
                        {plan.price === 0 ? 'Start free' : `Choose ${plan.name}`}
                      </Link>
                    </div>
                  </div>
                </Cell>
              )
            })}
          </div>

          <p className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/40">
            <span className="flex items-center gap-2">
              <Check className="size-4 text-[#7cabff]" />
              No card for the free plan
            </span>
            <span className="flex items-center gap-2">
              <Check className="size-4 text-[#7cabff]" />
              Credits never expire on paid plans
            </span>
            <span className="flex items-center gap-2">
              <Check className="size-4 text-[#7cabff]" />
              Cancel any time — access runs to the end of the period
            </span>
          </p>
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-white/[0.06]">
        <SectionArc className="top-[38%]" />
        <div className="relative z-10 mx-auto max-w-7xl px-8 py-28 text-center">
          <SectionReveal>
            <h2 className="mx-auto max-w-3xl text-[clamp(2.2rem,5vw,4rem)] font-bold leading-[1.05] tracking-[-0.035em]">
              Bring a brief.
              <span className="text-white/45"> Leave with a brand.</span>
            </h2>
          </SectionReveal>
          <SectionReveal delay={0.1}>
            <Link
              href="/register"
              className="mt-10 inline-flex items-center gap-2 rounded-full bg-[image:linear-gradient(100deg,#7C3AED,#4F46E5_55%,#3B82F6)] px-8 py-4 text-sm font-semibold shadow-[0_0_50px_-10px_#4F46E5] transition-transform duration-200 hover:scale-[1.03]"
            >
              Start free
              <ArrowRight className="size-4 rtl:rotate-180" />
            </Link>
          </SectionReveal>
        </div>
      </section>

      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-8 py-10">
          <span className="flex items-center gap-2.5">
            <LogoMark className="size-5" id="horizon-foot" />
            <span className="text-sm font-semibold">Brandora</span>
          </span>
          <Link
            href="/register"
            className="text-sm text-white/50 transition-colors hover:text-white"
          >
            Start free
          </Link>
        </div>
      </footer>
    </div>
  )
}
