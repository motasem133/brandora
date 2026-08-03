import { Globe, Languages, Palette, Share2 } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { buttonVariants } from '@/components/ui/button'
import { Logo, LogoMark } from '@/components/ui/logo'
import { Card } from '@/components/ui/card'
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

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 animate-fade-in">
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
        <LogoMark className="mx-auto mb-8 size-16 animate-scale-in" animated id="hero" />

        <h1
          className="font-display text-4xl font-bold leading-tight animate-fade-up sm:text-6xl"
          style={{ animationDelay: '80ms' }}
        >
          <span className="gradient-text">{t('heroTitle')}</span>
        </h1>
        <p
          className="mx-auto mt-6 max-w-xl text-lg text-fg-secondary animate-fade-up"
          style={{ animationDelay: '160ms' }}
        >
          {t('heroSubtitle')}
        </p>
        <div
          className="mt-10 flex flex-wrap justify-center gap-3 animate-fade-up"
          style={{ animationDelay: '240ms' }}
        >
          <Link href="/register" className={buttonVariants({ size: 'lg' })}>
            {t('ctaPrimary')}
          </Link>
          <Link href="/pricing" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            {t('ctaSecondary')}
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-24 stagger-children sm:grid-cols-2">
        {features.map(({ icon: Icon, title, body }, index) => (
          <Card key={title} className="group interactive" style={{ '--i': index } as React.CSSProperties}>
            <div className="mb-4 inline-flex rounded-lg bg-brand/15 p-2.5 transition-transform duration-200 group-hover:scale-110">
              <Icon className="size-5 text-brand" />
            </div>
            <h2 className="font-display text-lg font-semibold">{title}</h2>
            <p className="mt-1.5 text-sm text-fg-secondary">{body}</p>
          </Card>
        ))}
      </section>
    </div>
  )
}
