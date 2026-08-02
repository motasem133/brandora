import { expect, test } from '@playwright/test'

import { firstGeneratedProjectId } from './fixtures/db'

/**
 * Tab selection.
 *
 * The Assistant tab once rendered but could never be selected — clicking it
 * silently fell back to Branding, because the tab list was mutated after the
 * active tab had been derived from it. Nothing server-side caught that: the
 * page returned 200 either way.
 */
test.describe('project tabs', () => {
  let projectId: string

  test.beforeAll(async () => {
    projectId = await firstGeneratedProjectId()
  })


  test('every visible tab opens its own panel', async ({ page }) => {
    await page.goto(`/en/dashboard/projects/${projectId}`)

    const tabs = page.getByRole('link', { name: /Branding|Website|Social media|Assistant/ })
    const count = await tabs.count()
    expect(count).toBeGreaterThan(1)

    /*
     * The assistant is matched on its composer rather than its empty state:
     * once a project has a conversation the empty state is gone, and the
     * placeholder is an attribute rather than text content.
     */
    const panels: { label: string; slug: string; locate: (p: typeof page) => ReturnType<typeof page.getByText> }[] = [
      { label: 'Branding', slug: 'branding', locate: (p) => p.getByText(/Name ideas|Logo concepts/).first() },
      { label: 'Website', slug: 'website', locate: (p) => p.getByText(/Edit website/).first() },
      { label: 'Social media', slug: 'social', locate: (p) => p.getByText(/Instagram bio/).first() },
      { label: 'Assistant', slug: 'assistant', locate: (p) => p.getByPlaceholder('Ask for a change…') },
    ]

    for (const panel of panels) {
      const tab = page.getByRole('link', { name: panel.label, exact: true })
      if ((await tab.count()) === 0) continue

      await tab.click()
      await expect(page).toHaveURL(new RegExp(`tab=${panel.slug}`))
      await expect(panel.locate(page)).toBeVisible()
    }
  })
})
