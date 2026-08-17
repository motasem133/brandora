import { setRequestLocale } from 'next-intl/server'

import { alternatesFor } from '@/lib/seo'

import { LegalPage } from '@/components/features/legal/legal-page'
import { privacy } from '@/content/legal'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const doc = privacy[locale === 'ar' ? 'ar' : 'en']
  return {
    title: `${doc.title} · Brandora`,
    description: doc.intro.slice(0, 155),
    alternates: alternatesFor(locale, '/privacy'),
  }
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  return <LegalPage doc={privacy[locale === 'ar' ? 'ar' : 'en']} />
}
