import { Globe, Languages, Palette, Share2 } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { buttonVariants } from '@/components/ui/button'
import { Logo, LogoMark } from '@/components/ui/logo'
import { Reveal, Stagger, StaggerItem } from '@/components/ui/motion'
import { Link } from '@/i18n/navigation'

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('Landing')

  const features = [
    { icon: Palette, title: t('featureBrandingTitle'), body: t('featureBrandingBody') },
    { icon: Globe, title: t('featureWebsiteTitle'), body: t('featureWebsiteBody') },
    { icon: Share2, title: t('featureSocialTitle'), body: t('featureSocialBody') },
    { icon: Languages, title: t('featureArabicTitle'), body: t('featureArabicBody') },
  ]

  return (
    <div className="relative min-h-dvh overflow-hidden">
      {/*
        A single soft wash behind the hero, drifting slowly. It is the only
        always-on motion above the fold — anything more competes with the
        headline it is supposed to frame.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] opacity-[0.16] blur-3xl gradient-animated"
        style={{ maskImage: 'radial-gradient(60% 60% at 50% 0%, black, transparent)' }}
      />

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo className="text-xl" markClassName="size-7" animated />
        <nav className="flex items-center gap-2">
          <Link href="/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            Sign in
          </Link>
          <Link href="/register" className={buttonVariants({ size: 'sm' })}>
            {t('ctaPrimary')}
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-20 text-center sm:py-28">
        <Reveal>
          <LogoMark className="mx-auto mb-8 size-20" animated id="hero" />
        </Reveal>

        <Reveal delay={0.08}>
          <h1 className="font-display text-5xl font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-7xl">
            <span className="gradient-text">{t('heroTitle')}</span>
          </h1>
        </Reveal>

        <Reveal delay={0.16}>
          <p className="mx-auto mt-6 max-w-xl text-lg text-fg-secondary">{t('heroSubtitle')}</p>
        </Reveal>

        <Reveal delay={0.24}>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href="/register" className={buttonVariants({ size: 'lg' })}>
              {t('ctaPrimary')}
            </Link>
            <Link href="/pricing" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
              {t('ctaSecondary')}
            </Link>
          </div>
        </Reveal>
      </section>

      <Stagger className="mx-auto grid max-w-6xl gap-5 px-6 pb-24 sm:grid-cols-2">
        {features.map(({ icon: Icon, title, body }) => (
          <StaggerItem key={title}>
            <div className="card-lit interactive group h-full p-7">
              <div className="icon-chip mb-5 transition-transform duration-200 group-hover:scale-110">
                <Icon className="size-5" />
              </div>
              <h2 className="font-display text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-fg-secondary">{body}</p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  )
}
