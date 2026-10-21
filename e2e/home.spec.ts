import { expect, test } from './fixtures'
import { LOCATION_ALLOWED, seedSavedLocation, stubExternalServices, stubForecast } from './support'

// Page-level checks. Day switching is in day-switching.spec.ts, the theme in theme.spec.ts.

test.describe('home page with a forecast', () => {
  test.use(LOCATION_ALLOWED)

  test.beforeEach(async ({ page }) => {
    await stubExternalServices(page)
    await stubForecast(page)
    await seedSavedLocation(page)
  })

  test('shows the verdict cards, rain chart and Other Days', async ({ page }) => {
    await page.goto('/home')
    await expect(page.getByRole('heading', { name: 'Should you wash?' })).toBeVisible()
    await expect(page.getByRole('article', { name: 'Laundry' })).toBeVisible()
    await expect(page.getByRole('article', { name: 'Car wash' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Rain chance' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Other days' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Update location, Manila' })).toBeVisible()
  })

  test('has no horizontal overflow', async ({ page }) => {
    await page.goto('/home')
    await expect(page.getByRole('article', { name: 'Laundry' })).toBeVisible()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
})
