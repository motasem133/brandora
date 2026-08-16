import { expect, test } from '@playwright/test'

/**
 * Finding one brand among several.
 *
 * PRODUCT.md names the returning freelancer as the account that matters, and
 * this is the screen they live on — with no search and no sort, the way to a
 * particular brand was to read every card. The controls live in the URL, so what
 * is asserted here is the whole mechanism: the query survives a navigation, the
 * sort survives a search, and a search that finds nothing says so rather than
 * looking like an account with no brands in it.
 *
 * Read from the page rather than hardcoded. The fixture account accumulates
 * projects as other suites run, so a test that named one would be asserting the
 * state of a shared database rather than the behaviour of this screen.
 */
test.describe('projects list', () => {
  const cards = (page: import('@playwright/test').Page) =>
    page.getByRole('heading', { level: 2 })

  /**
   * The list, once it is the list.
   *
   * Reading the headings straight after a navigation raced the Suspense
   * boundary and counted the skeleton's zero — which looked exactly like a
   * search that matched nothing, and is the sort of pass-by-accident this suite
   * exists to avoid.
   */
  const settled = async (page: import('@playwright/test').Page) => {
    await expect(page.getByRole('status', { name: 'Loading your brands' })).toHaveCount(0)
  }

  test('a search narrows the list and keeps its way back', async ({ page }) => {
    await page.goto('/en/dashboard/projects')
    await settled(page)

    const all = await cards(page).allInnerTexts()
    expect(all.length).toBeGreaterThan(1)

    /* A needle taken from a brand that is actually there. Its first word, so
       the match is a substring rather than the whole field. */
    const needle = all[0].trim().split(/\s+/)[0]

    await page.getByRole('searchbox', { name: 'Search your brands' }).fill(needle)
    await page.keyboard.press('Enter')

    await expect(page).toHaveURL(new RegExp(`q=${encodeURIComponent(needle)}`, 'i'))
    await settled(page)

    const found = await cards(page).allInnerTexts()
    expect(found.length).toBeGreaterThan(0)
    expect(found.length).toBeLessThanOrEqual(all.length)
    for (const name of found) {
      expect(name.toLowerCase()).toContain(needle.toLowerCase())
    }
  })

  test('a search that matches nothing is not an empty account', async ({ page }) => {
    await page.goto('/en/dashboard/projects?q=zzzznotabrandzzzz')
    await settled(page)

    /* The distinction the state exists to make: this must not offer to generate
       a first brand, because the customer has several. */
    await expect(page.getByText(/No brand matches/)).toBeVisible()
    await expect(page.getByText('Nothing here yet')).toHaveCount(0)

    await page.getByRole('link', { name: 'Clear search' }).click()
    await expect(page).toHaveURL(/\/dashboard\/projects$/)
    await settled(page)
    expect((await cards(page).allInnerTexts()).length).toBeGreaterThan(1)
  })

  test('sorting by name orders by name, and survives a search', async ({ page }) => {
    await page.goto('/en/dashboard/projects')

    await page.getByRole('link', { name: 'By name' }).click()
    await expect(page).toHaveURL(/sort=name/)
    await settled(page)

    const names = (await cards(page).allInnerTexts()).map((n) => n.trim())
    const sorted = [...names].sort((a, b) => a.localeCompare(b, 'en'))
    expect(names).toEqual(sorted)

    /* The sort is carried through the search form as a hidden field — searching
       must not silently throw away a sort chosen a moment ago. */
    await page.getByRole('searchbox', { name: 'Search your brands' }).fill('a')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/sort=name/)
  })

  test('the default sort is newest, and is the bare URL', async ({ page }) => {
    await page.goto('/en/dashboard/projects')

    /* The default is the absence of the parameter, so the plain URL and the
       explicitly-default URL are one page rather than two. */
    await expect(page.getByRole('link', { name: 'Newest' })).toHaveAttribute(
      'href',
      /\/dashboard\/projects$/,
    )
  })
})
