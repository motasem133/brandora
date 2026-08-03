import { ArrowRight, Check } from 'lucide-react'
import { setRequestLocale } from 'next-intl/server'
import Image from 'next/image'

import { HeroBadge } from '@/components/features/landing/float'
import {
  Cell,
  Horizon,
  LightSweep,
  SectionArc,
  ProductFrame,
  SectionReveal,
} from '@/components/features/landing/horizon'
import { AfterHeadline, HeadlineWords } from '@/components/features/landing/motion-hero'
import { KIT, PLANS, STEPS } from '@/components/features/landing/preview-data'
import { LogoMark } from '@/components/ui/logo'
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

          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {KIT.map((entry, index) => (
              <Cell key={entry.item} index={index}>
                {/* A lit top edge on each cell, so the section keeps the same
                    light the horizon casts rather than going flat. */}
                <div className="group h-full rounded-2xl bg-[image:linear-gradient(180deg,rgba(167,139,250,0.35),rgba(255,255,255,0.04)_38%)] p-px transition-transform duration-200">
                  <div className="h-full rounded-[calc(1rem-1px)] bg-[#080c16] p-6 transition-colors duration-200 group-hover:bg-[#0c1222]">
                    <p className="text-base font-semibold">{entry.item}</p>
                    <p className="mt-2 text-sm leading-relaxed text-white/45">{entry.detail}</p>
                  </div>
                </div>
              </Cell>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- how */}
      <section id="how" className="relative overflow-hidden border-t border-white/[0.06]">
        <SectionArc className="top-0" />
        <div className="relative z-10 mx-auto max-w-7xl px-8 py-28">
          <SectionReveal>
            <h2 className="text-[clamp(2rem,4vw,3.2rem)] font-bold tracking-[-0.03em]">
              How a run works
            </h2>
          </SectionReveal>

          {/* The rail: one line of light through the sequence. */}
          <div className="relative mt-16">
            <div
              aria-hidden
              className="absolute inset-x-0 top-[18px] hidden h-px lg:block"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(167,139,250,0.55), rgba(96,165,250,0.55), transparent)',
              }}
            />
            <div className="grid gap-10 md:grid-cols-3 lg:grid-cols-5">
            {STEPS.map((step, index) => (
              <Cell key={step.n} index={index}>
                <div className="relative">
                  <span className="relative z-10 inline-flex size-9 items-center justify-center rounded-full border border-white/12 bg-[#0a0f1c] text-sm font-semibold shadow-[0_0_24px_-6px_rgba(139,92,246,0.9)]">
                    {index + 1}
                  </span>
                  <p className="mt-4 text-lg font-semibold">{step.n}</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/45">{step.body}</p>
                </div>
              </Cell>
            ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- pricing */}
      <section id="pricing" className="relative overflow-hidden border-t border-white/[0.06]">
        <SectionArc className="top-0" />

        <div className="relative z-10 mx-auto max-w-7xl px-8 py-28">
          <SectionReveal>
            <h2 className="text-[clamp(2rem,4vw,3.2rem)] font-bold tracking-[-0.03em]">Pricing</h2>
          </SectionReveal>
          <p className="mt-3 max-w-[48ch] text-white/50">
            Start free — a full identity, no card. Upgrade when you need more runs, more credits,
            or your own domain.
          </p>

          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan, index) => {
              const featured = index === 2

              return (
                <Cell key={plan.name} index={index}>
                <div
                  className={
                    featured
                      ? 'relative rounded-3xl bg-[image:linear-gradient(160deg,#7C3AED,#4F46E5_55%,#3B82F6)] p-px shadow-[0_0_60px_-18px_#4F46E5]'
                      : 'rounded-3xl border border-white/[0.08] bg-white/[0.02] p-px'
                  }
                >
                  <div
                    className={
                      featured
                        ? 'h-full rounded-[calc(1.5rem-1px)] bg-[#080c16]/85 p-7'
                        : 'h-full rounded-[calc(1.5rem-1px)] p-7'
                    }
                  >
                    <p className="text-sm text-white/50">{plan.name}</p>
                    <p className="mt-4 text-5xl font-bold tracking-[-0.035em]">
                      {plan.price === 0 ? 'Free' : `$${plan.price}`}
                      {plan.price > 0 && (
                        <span className="ms-1 text-base font-normal text-white/40">/mo</span>
                      )}
                    </p>
                    <p className="mt-4 text-sm text-white/70">{plan.credits}</p>
                    <p className="mt-1 text-sm leading-relaxed text-white/45">{plan.note}</p>

                    <Link
                      href="/register"
                      className={
                        featured
                          ? 'mt-8 flex items-center justify-center gap-2 rounded-full bg-[image:linear-gradient(100deg,#7C3AED,#3B82F6)] py-3 text-sm font-semibold transition-transform duration-200 hover:scale-[1.02]'
                          : 'mt-8 flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.05] py-3 text-sm font-medium transition-colors hover:bg-white/[0.1]'
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

          <p className="mt-8 flex items-center gap-2 text-sm text-white/40">
            <Check className="size-4 text-[#7cabff]" />
            Every plan includes the full identity — names, logos, palette, typography, brand story.
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
