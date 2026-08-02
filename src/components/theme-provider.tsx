'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'

/**
 * Dark is the default.
 *
 * Both themes must map to a non-empty class name: next-themes calls
 * `classList.remove(previous)` when switching, and DOMTokenList throws on an
 * empty token. The dark token values live on `:root` so server-rendered HTML is
 * already dark before any JS runs; `.dark` is therefore just a marker class.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
      value={{ light: 'light', dark: 'dark' }}
    >
      {children}
    </NextThemesProvider>
  )
}
