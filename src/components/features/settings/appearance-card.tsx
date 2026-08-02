'use client'

import { Moon, Sun } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { toggleTheme } from '@/lib/theme'

export function AppearanceCard() {
  const t = useTranslations('Settings')

  return (
    <Card className="space-y-4">
      <div>
        <CardTitle>{t('appearance')}</CardTitle>
        <CardDescription className="mt-1">{t('appearanceHint')}</CardDescription>
      </div>

      <button
        onClick={() => toggleTheme()}
        className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm transition-colors hover:border-brand"
      >
        {/* Icons swap in CSS so no render is needed to pick one. */}
        <Sun className="icon-when-dark size-4" />
        <Moon className="icon-when-light size-4" />
        {t('toggleTheme')}
      </button>
    </Card>
  )
}
