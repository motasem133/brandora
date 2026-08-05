'use client'

import { Moon, Sun } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
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

      {/*
        The icons swap in CSS, which is why no render is needed to pick one —
        and why the control said nothing about its own state to anyone who
        could not see them. The current theme is now written out, in text, for
        the same reason the icon exists: so you can tell what pressing does.
      */}
      <Button variant="outline" onClick={() => toggleTheme()}>
        <Sun className="icon-when-dark size-4" />
        <Moon className="icon-when-light size-4" />
        {t('toggleTheme')}
        <span className="icon-when-dark text-fg-muted">· {t('themeDark')}</span>
        <span className="icon-when-light text-fg-muted">· {t('themeLight')}</span>
      </Button>
    </Card>
  )
}
