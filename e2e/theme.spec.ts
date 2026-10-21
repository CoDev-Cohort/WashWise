import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import {
  LOCATION_ALLOWED,
  seedSavedLocation,
  setTheme,
  stubExternalServices,
  stubForecast,
} from './support'

// Theme (P4.4 Story 4): follows the system until the user picks one; the pick survives reloads and
// is applied before the first paint.
test.use(LOCATION_ALLOWED)

const html = (page: Page) => page.locator('html')
const TO_DARK = { name: 'Switch to dark mode' }
const TO_LIGHT = { name: 'Switch to light mode' }

/** Records whether <html> was dark at the moment React first put something inside #root. */
async function recordThemeAtFirstRender(page: Page) {
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
}

const darkAtFirstRender = (page: Page) =>
  page.evaluate(() => (window as unknown as { darkAtFirstRender?: boolean }).darkAtFirstRender)

async function openHome(page: Page) {
  await page.goto('/home')
  await expect(page.getByRole('article', { name: 'Laundry' })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await stubExternalServices(page)
  await stubForecast(page)
  await seedSavedLocation(page)
})

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`system ${colorScheme}, nothing saved`, () => {
    test.use({ colorScheme })

    test(`the app is ${colorScheme} from the first render (S4.1)`, async ({ page }) => {
      await recordThemeAtFirstRender(page)
      await openHome(page)
      expect(await darkAtFirstRender(page)).toBe(colorScheme === 'dark')
      if (colorScheme === 'dark') await expect(html(page)).toHaveClass(/dark/)
      else await expect(html(page)).not.toHaveClass(/dark/)
    })
  })
}

test.describe('system light', () => {
  test.use({ colorScheme: 'light' })

  test('the toggle switches the theme and says what it will do next (S4.2)', async ({ page }) => {
    await openHome(page)
    await page.getByRole('button', TO_DARK).click()
    await expect(html(page)).toHaveClass(/dark/)
    await expect(page.getByRole('button', TO_LIGHT)).toBeVisible()

    await page.getByRole('button', TO_LIGHT).click()
    await expect(html(page)).not.toHaveClass(/dark/)
    await expect(page.getByRole('button', TO_DARK)).toBeVisible()
  })

  test('a chosen dark theme survives a reload with no light flash (S4.3)', async ({ page }) => {
    await openHome(page)
    await page.getByRole('button', TO_DARK).click()
    await recordThemeAtFirstRender(page)
    await page.reload()
    await expect(page.getByRole('article', { name: 'Laundry' })).toBeVisible()
    expect(await darkAtFirstRender(page)).toBe(true)
  })
})

test.describe('system dark', () => {
  test.use({ colorScheme: 'dark' })

  test('a saved light theme wins, with no dark flash (S4.3)', async ({ page }) => {
    await setTheme(page, 'light')
    await recordThemeAtFirstRender(page)
    await openHome(page)
    expect(await darkAtFirstRender(page)).toBe(false)
    await expect(html(page)).not.toHaveClass(/dark/)
  })
})
