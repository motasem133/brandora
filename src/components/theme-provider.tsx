'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'

/**
 * Dark is the default. `value` maps next-themes' class names onto our tokens —
 * dark needs no class (it lives on :root), light adds `.light`.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
      value={{ light: 'light', dark: '' }}
    >
      {children}
    </NextThemesProvider>
  )
}
