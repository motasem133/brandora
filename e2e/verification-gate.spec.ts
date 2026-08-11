import { expect, test } from '@playwright/test'

import { firstGeneratedProjectId, sql } from './fixtures/db'

const E2E_EMAIL = process.env.E2E_EMAIL ?? 'e2e@brandora-test.com'

/**
 * The gate that now falls after the first run rather than before it.
 *
 * Every control that spends credits reads one boolean — `mustVerify`, computed
 * server-side — and the whole risk of moving the gate is that one of them reads
 * it the wrong way round: a Generate button left live on an account the server
 * will refuse, or a verification panel shown to somebody who has nothing to
 * verify. Types cannot catch an inverted boolean, so a browser has to.
 *
 * The verified direction is asserted by the rest of the suite, which presses
 * these controls on this same account every run. This is the other direction:
 * the fixture is flipped to unverified, and it has spent credits, so it is the
 * account that must now confirm before it may run again.
 */
test.describe('the verification gate', () => {
  let projectId: string

  test.beforeAll(async () => {
    projectId = await firstGeneratedProjectId()
    await sql`UPDATE users SET email_verified = false WHERE email = ${E2E_EMAIL}`
  })

  /* Restored whatever happened above — every other suite signs in as this
     account and expects to be able to spend. */
  test.afterAll(async () => {
    await sql`UPDATE users SET email_verified = true WHERE email = ${E2E_EMAIL}`
  })

  test('a second run is refused on the page, with the code box to fix it', async ({ page }) => {
    /*
     * Sessions carry a five-minute cache of the user in `session_data`, and the
     * sign-in that starts this suite fills it while the fixture is still
     * verified — so without dropping it the page answers from a copy of the
     * account made before the update above, and reads as verified for the whole
     * run. The token cookie stays: the session is still valid, it is only the
     * cached snapshot of the user that has to be re-read.
     */
    await page.context().clearCookies({ name: 'better-auth.session_data' })

    await page.goto(`/en/dashboard/projects/${projectId}`)

    /*
     * The generation panel is gone by now — it disappears once a project is
     * complete — so the surfaces that have to carry the refusal are the logo
     * composer and the social kit, which is what somebody with a finished brand
     * actually presses. Both say it, hence `.first()`.
     */
    await expect(page.getByText(/Verify your email to keep generating/).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /Send and regenerate/ })).toBeDisabled()

    /* The refusal is useless without the control that lifts it — a bare "verify
       your email" with nothing to press is the failure this shipped with once. */
    await expect(page.getByRole('textbox', { name: /Digit 1/i }).first()).toBeVisible()
  })
})
