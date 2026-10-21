import { expect, test } from '@playwright/test'
import { LOCATION_ALLOWED, seedSavedLocation, stubExternalServices, stubForecast } from './support'

const TITLE = { name: 'Should you wash?' }

test.describe('home page with a forecast', () => {
  test.use(LOCATION_ALLOWED)

  test.beforeEach(async ({ page }) => {
    await stubExternalServices(page)
    await stubForecast(page)
    await seedSavedLocation(page)
  })

  test('shows the verdict cards, rain chart and Other Days', async ({ page }) => {
    await page.goto('/home')
    await expect(page.getByRole('heading', TITLE)).toBeVisible()
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

  test('choosing a day changes the chart window', async ({ page }) => {
    await page.goto('/home')
    const chart = page.getByRole('region', { name: 'Rain chance' })
    await expect(chart.getByText('10 AM: ', { exact: false })).toHaveCount(1)
    await page.getByRole('button', { name: /^SAT/ }).click()
    await expect(page.getByRole('button', { name: /^SAT/ })).toHaveAttribute('aria-pressed', 'true')
    await expect(chart.getByText('12 PM: ', { exact: false })).toHaveCount(1)
    await expect(chart.getByText('10 AM: ', { exact: false })).toHaveCount(0)
  })

  test('days can be chosen with the keyboard alone', async ({ page, isMobile }) => {
    test.skip(isMobile, 'keyboard navigation is a desktop check')
    await page.goto('/home')
    await page.getByRole('button', { name: /^Today/ }).focus()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')
    await expect(page.getByRole('button', { name: /^WED/ })).toHaveAttribute('aria-pressed', 'true')
  })

  test('the theme toggle persists across a reload', async ({ page }) => {
    await page.goto('/home')
    await page.getByRole('button', { name: 'Switch to dark mode' }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await page.getByRole('button', { name: 'Switch to light mode' }).click()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  })
})

test.describe('system dark mode, nothing saved', () => {
  test.use({ ...LOCATION_ALLOWED, colorScheme: 'dark' })

  test('is dark before the app renders: no light flash', async ({ page }) => {
    await stubExternalServices(page)
    await stubForecast(page)
    await seedSavedLocation(page)
    // Record the theme at the moment React first puts something inside #root.
    await page.addInitScript(() => {
      const observer = new MutationObserver(() => {
        const root = document.getElementById('root')
        if (root && root.childNodes.length > 0) {
          ;(window as unknown as { darkAtFirstRender: boolean }).darkAtFirstRender =
            document.documentElement.classList.contains('dark')
          observer.disconnect()
        }
      })
      observer.observe(document, { childList: true, subtree: true })
    })
    await page.goto('/home')
    await expect(page.getByRole('heading', TITLE)).toBeVisible()
    await expect(page.locator('html')).toHaveClass(/dark/)
    const dark = await page.evaluate(
      () => (window as unknown as { darkAtFirstRender?: boolean }).darkAtFirstRender,
    )
    expect(dark).toBe(true)
  })
})
