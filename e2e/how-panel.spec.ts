import { expect, test } from '@playwright/test'

/**
 * The artifact beside the process list has to match the step being read.
 *
 * It did not. One screenshot of the brief sat beside all five steps, captioned
 * "The first of eight questions", so four fifths of the time the picture argued
 * with the words next to it — and the caption is the half a visitor believes.
 *
 * Asserted by scrolling rather than by reading the DOM: the panel is driven by
 * an IntersectionObserver over the list items, and an observer is exactly the
 * kind of thing that passes a unit test and never fires on a real page. Both
 * locales, because the observer's band is symmetric but the layout under it
 * mirrors, and a phone as well as a desktop, because below `lg` the panel is not
 * sticky and the steps stack — which is a different code path through the same
 * observer.
 */

const CAPTIONS = {
  en: [
    'The first of eight questions',
    'Five sections, in sequence',
    'Two concepts arrive',
    'Regenerate a single section',
    'The address a published site takes',
  ],
  ar: [
    'أول سؤال من ثمانية',
    'خمسة أقسام بالترتيب',
    'يصل مفهومان',
    'أعد توليد قسم واحد',
    'العنوان الذي يأخذه الموقع المنشور',
  ],
} as const

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'phone', width: 390, height: 844 },
] as const

test.describe('how it works panel', () => {
  /* The landing page is public; the signed-in state the rest of the suite runs
     with would replace the header's call to action and nothing else here. */
  test.use({ storageState: { cookies: [], origins: [] } })

  for (const locale of ['en', 'ar'] as const) {
    for (const viewport of VIEWPORTS) {
      test(`${locale} on ${viewport.name}: each step brings its own artifact`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        await page.goto(`/${locale}`)

        const caption = page.locator('#how [aria-live="polite"]')
        await expect(caption).toBeVisible()

        for (const [index, expected] of CAPTIONS[locale].entries()) {
          /* Centred, not merely scrolled into view: the observation band is the
             middle tenth of the viewport, which is what stops two of these tall
             steps being current at once. */
          await page.evaluate((step) => {
            document.getElementById(`how-step-${step}`)?.scrollIntoView({ block: 'center' })
          }, index)

          await expect(caption).toContainText(expected)
        }
      })
    }
  }

  test('the four marks are named, so "two concepts" can be counted', async ({ page }) => {
    await page.goto('/en')

    /* The claim and the count in one assertion. The heading said two while the
       grid showed four, which was the first countable thing on the section and
       it did not survive counting. */
    const sheet = page.getByRole('figure').filter({ hasText: 'Concept 1' })
    await expect(sheet.first()).toBeVisible()

    for (const name of ['Concept 1', 'Concept 2', 'Concept 2, symbol only', 'Name only']) {
      await expect(page.getByRole('img', { name, exact: true }).first()).toBeVisible()
    }
  })
})
