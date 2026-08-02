import { Globe, Languages, Palette, Share2 } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { buttonVariants } from '@/components/ui/button'
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
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-xl font-bold gradient-text">Brandora</span>
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
        <h1 className="font-display text-4xl font-bold leading-tight sm:text-6xl">
          <span className="gradient-text">{t('heroTitle')}</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-fg-secondary">{t('heroSubtitle')}</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/register" className={buttonVariants({ size: 'lg' })}>
            {t('ctaPrimary')}
          </Link>
          <Link href="/pricing" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            {t('ctaSecondary')}
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-24 sm:grid-cols-2">
        {features.map(({ icon: Icon, title, body }) => (
          <Card key={title}>
            <div className="mb-4 inline-flex rounded-lg bg-brand/15 p-2.5">
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
