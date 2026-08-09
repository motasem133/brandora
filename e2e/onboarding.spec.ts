import { expect, test } from '@playwright/test'

/**
 * The onboarding wizard.
 *
 * It is the one flow in the product that spends a customer's credits from its
 * last press, so what is asserted here is everything up to that press: that the
 * price and the balance are stated before the decision, that a blocked run says
 * why, and that the answers which carry between brands arrive filled in.
 *
 * The final button is deliberately never pressed. Doing so would spend nine
 * real credits and start a real generation on every CI run.
 */
test.describe('onboarding wizard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/onboarding')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('opens on the first question, not on a dialog', async ({ page }) => {
    // The cancel confirmation used to be the first heading in the document, so
    // browsing by heading met "Leave without creating your brand?" first.
    const headings = page.locator('h1, h2')
    await expect(headings.first()).toHaveText(/build your brand/i)
    await expect(headings.nth(1)).toHaveText(/business name/i)
  })

  /*
   * Step 1 was the one step with no gate on it, so a name the Server Action
   * would refuse travelled through five more questions before anyone said so —
   * a rejection raised after the work, about something typed before it.
   */
  test('refuses a name that is not one, on the step it was typed', async ({ page }) => {
    const field = page.getByRole('textbox').first()
    await expect(field).toHaveAttribute('maxlength', '60')

    await field.fill('a')
    await page.getByRole('button', { name: 'Next', exact: true }).click()

    await expect(page.getByText(/at least two letters/i)).toBeVisible()
    await expect(page.getByRole('heading', { name: /business name/i })).toBeVisible()
  })

  test('carries the stable answers over from the last brand', async ({ page }) => {
    const next = page.getByRole('button', { name: 'Next', exact: true })
    await next.click()

    // Industry and country come from the previous project; the brief and the
    // name never do.
    await expect(page.getByText(/Carried over from/)).toBeVisible()
    await next.click()
    await expect(page.locator('select')).not.toHaveValue('')
  })

  test('states the colour cap instead of silently ignoring the fourth', async ({ page }) => {
    const next = page.getByRole('button', { name: 'Next', exact: true })
    for (let step = 1; step < 6; step++) {
      if (step === 4) {
        await page.locator('textarea').fill('A specialty coffee bar for people who come to work.')
      }
      await next.click()
    }

    const swatches = page.locator('fieldset button[aria-pressed]')
    await expect(page.locator('fieldset legend')).toHaveText(/0 of 3/)

    // Every swatch names its colour: unselected, they used to contain nothing.
    await expect(swatches.first()).toHaveAttribute('aria-label', /\w+/)

    for (let i = 0; i < 3; i++) await swatches.nth(i).click()
    await expect(page.locator('fieldset legend')).toHaveText(/3 of 3/)
    await expect(swatches.nth(3)).toBeDisabled()
  })

  /*
   * Typed, not filled. `.fill()` sets the value in one operation, which is
   * exactly why the whole suite missed a regression that left every field in
   * the wizard accepting one character per click: a ref callback re-firing
   * `.focus()` on the heading after each keystroke.
   */
  test('accepts typing, one character after another', async ({ page }) => {
    const name = page.locator('input').first()
    await name.click()
    await page.keyboard.type('Acme Coffee', { delay: 30 })
    await expect(name).toHaveValue('Acme Coffee')

    const next = page.getByRole('button', { name: 'Next', exact: true })
    await next.click()
    await next.click()
    await next.click()

    const brief = page.locator('textarea')
    await brief.click()
    await page.keyboard.type('A specialty coffee bar', { delay: 20 })
    await expect(brief).toHaveValue('A specialty coffee bar')
  })

  test('prices the run before the press that spends it', async ({ page }) => {
    const next = page.getByRole('button', { name: 'Next', exact: true })
    for (let step = 1; step < 8; step++) {
      if (step === 4) {
        await page.locator('textarea').fill('A specialty coffee bar for people who come to work.')
      }
      await next.click()
    }

    await expect(page.getByText(/You have \d+ credits/)).toBeVisible()

    const generate = page.getByRole('button', { name: /Generate my brand · \d+ credits/ })
    await expect(generate).toBeVisible()
    await expect(generate).toBeEnabled()
  })
})
