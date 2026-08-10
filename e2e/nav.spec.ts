import { expect, test } from '@playwright/test'

/**
 * Exactly one navigation, and nothing drawn on top of anything else.
 *
 * The wide bar centred itself with `position: absolute`, which takes it out of
 * the layout: it could not push the credits pill and the New project button on
 * the end, only be painted over them. It appeared from 1024px and needed about
 * 1400px to fit once the Admin link was present, so on every ordinary laptop
 * "Admin" was printed across "Credits 462" — by 62px at 1280 and 190px at 1024.
 *
 * Nothing errored. No breakpoint was crossed, no request failed, no test
 * noticed; it was simply wrong on screen for anyone who looked. That is the
 * whole reason this measures geometry rather than asserting a class name.
 *
 * The signed-in fixture is an administrator, which matters: the sixth
 * destination is exactly what tips the row over, so a suite running as a
 * customer would not have caught this.
 */
test.describe('the app bar', () => {
  /** Below this the stacked row takes over; at and above it the bar fits. */
  const BREAKPOINT = 1280

  const widths = [1024, 1152, 1279, BREAKPOINT, 1366, 1440, 1920]

  test('never overlaps itself, at any width', async ({ page }) => {
    await page.goto('/en/dashboard')

    const bar = page.locator('header > div > div > nav[aria-label]')
    const stacked = page.locator('header > nav[aria-label]')

    for (const width of widths) {
      await page.setViewportSize({ width, height: 800 })

      const wide = width >= BREAKPOINT
      await expect(bar, `bar at ${width}px`).toBeVisible({ visible: wide })
      await expect(stacked, `stacked row at ${width}px`).toBeVisible({ visible: !wide })

      if (!wide) continue

      /*
       * Measured against its two neighbours rather than against a number: the
       * mark on one side, the balance on the other are what it used to cover.
       */
      const nav = (await bar.boundingBox())!
      const mark = (await page.locator('header').locator('a').first().boundingBox())!
      const credits = (await page.locator('header').getByText(/Credits/).first().boundingBox())!

      expect(nav.x - (mark.x + mark.width), `bar overlaps the mark at ${width}px`).toBeGreaterThan(0)
      expect(credits.x - (nav.x + nav.width), `bar overlaps credits at ${width}px`).toBeGreaterThan(0)
    }
  })
})
