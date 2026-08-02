import { expect, test as setup } from '@playwright/test'

const AUTH_FILE = 'e2e/.auth/user.json'

/**
 * Signs in once and saves the session for every other test.
 *
 * Uses the seeded account rather than registering per run: sign-up is rate
 * limited to five an hour, which a suite that registers each time would exhaust
 * within a morning.
 */
setup('authenticate', async ({ page }) => {
  await page.goto('/en/login')

  await page.getByLabel('Email').fill(process.env.E2E_EMAIL ?? 'test@brandora.local')
  await page.getByLabel('Password').fill(process.env.E2E_PASSWORD ?? 'testpassword123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.waitForURL(/\/en\/dashboard/)
  await expect(page.getByRole('heading', { name: /Welcome back/ })).toBeVisible()

  await page.context().storageState({ path: AUTH_FILE })
})
