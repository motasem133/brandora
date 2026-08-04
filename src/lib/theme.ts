export type Theme = 'dark' | 'light'

export const THEME_STORAGE_KEY = 'brandora-theme'

/**
 * Runs before first paint, injected into <head> by a Server Component.
 *
 * It must be inline and synchronous: anything deferred lets the default dark
 * paint first and then flash to light for users who chose light.
 *
 * The theme is a `data-theme` attribute rather than a class, and that is
 * load-bearing. `<html>`'s `className` is rendered by the root layout, so React
 * owns it — and when the locale changes, `lang` and `dir` change with it, React
 * re-renders `<html>` on the client and reconciles `className` back to just the
 * font variables. A class added imperatively here is wiped by that pass, which
 * silently threw anyone on the light theme back to dark the moment they
 * switched language. React does not render `data-theme`, so it does not touch
 * it.
 */
export const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    document.documentElement.dataset.theme = stored === 'light' ? 'light' : 'dark';
  } catch (e) {
    document.documentElement.dataset.theme = 'dark';
  }
})();
`.trim()

/**
 * Flips the theme by mutating the attribute directly.
 *
 * Deliberately not React state: the only thing that depends on the theme is CSS
 * (tokens on :root and [data-theme='light'], and the toggle icons), so putting
 * it in state would add a render and a hydration mismatch for no benefit.
 */
export function toggleTheme(): Theme {
  const root = document.documentElement
  const next: Theme = root.dataset.theme === 'light' ? 'dark' : 'light'

  root.dataset.theme = next

  try {
    localStorage.setItem(THEME_STORAGE_KEY, next)
  } catch {
    // Private browsing with storage disabled — the class still applies for this page.
  }

  return next
}
