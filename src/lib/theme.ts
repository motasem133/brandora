export type Theme = 'dark' | 'light'

export const THEME_STORAGE_KEY = 'brandora-theme'

/**
 * Runs before first paint, injected into <head> by a Server Component.
 *
 * It must be inline and synchronous: anything deferred lets the default dark
 * paint first and then flash to light for users who chose light.
 */
export const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    document.documentElement.classList.add(stored === 'light' ? 'light' : 'dark');
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
`.trim()

/**
 * Flips the theme by mutating the class directly.
 *
 * Deliberately not React state: the only thing that depends on the theme is CSS
 * (tokens on :root/.light, and the toggle icons), so putting it in state would
 * add a render and a hydration mismatch for no benefit.
 */
export function toggleTheme(): Theme {
  const root = document.documentElement
  const next: Theme = root.classList.contains('light') ? 'dark' : 'light'

  root.classList.toggle('light', next === 'light')
  root.classList.toggle('dark', next === 'dark')

  try {
    localStorage.setItem(THEME_STORAGE_KEY, next)
  } catch {
    // Private browsing with storage disabled — the class still applies for this page.
  }

  return next
}
