export type Theme = 'dark' | 'light'

export const THEME_STORAGE_KEY = 'brandora-theme'

/**
 * Runs before first paint, injected into <head> by a Server Component.
 *
 * It must be inline and synchronous: anything deferred lets the default paint
 * first and then flash to the other theme for anyone who chose one.
 *
 * The default is daylight now, and the fallback in the `catch` with it. The
 * board's whole thesis is that a brand cannot be judged in the dark, so opening
 * the product in a night room and asking someone to find the switch would be
 * shipping the argument backwards. Anyone who explicitly chose dark still gets
 * dark — the stored value is what changed meaning, not what changed. Only the
 * absence of a choice reads differently, and it used to read as a decision
 * nobody had made.
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
    document.documentElement.dataset.theme = stored === 'dark' ? 'dark' : 'light';
  } catch (e) {
    document.documentElement.dataset.theme = 'light';
  }
})();
`.trim()

/**
 * Flips the theme by mutating the attribute directly.
 *
 * Deliberately not React state: the only thing that depends on the theme is CSS
 * (the board's tokens under [data-theme='dark'], and the toggle icons), so putting
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
