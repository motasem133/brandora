import { setRequestLocale } from 'next-intl/server'

import { alternatesFor } from '@/lib/seo'

import { LegalPage } from '@/components/features/legal/legal-page'
import { terms } from '@/content/legal'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const doc = terms[locale === 'ar' ? 'ar' : 'en']
  return {
    title: `${doc.title} · Brandora`,
    description: doc.intro.slice(0, 155),
    alternates: alternatesFor(locale, '/terms'),
  }
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  return <LegalPage doc={terms[locale === 'ar' ? 'ar' : 'en']} />
}
