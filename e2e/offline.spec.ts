import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import {
  FIXED_NOW,
  LOCATION_ALLOWED,
  seedSavedLocation,
  stubExternalServices,
  stubForecast,
} from './support'

const LAUNDRY = { name: 'Laundry' }
const HOUR = 60 * 60 * 1000

test.use({ ...LOCATION_ALLOWED, serviceWorkers: 'allow' })
test.skip(
  ({ browserName }) => browserName !== 'chromium',
  'Playwright’s WebKit has no service workers; offline on iPhone is checked by hand (SC-001)',
)

/** One online visit: the service worker installs its precache and the forecast is saved. */
async function visitOnline(page: Page) {
  await stubExternalServices(page)
  await stubForecast(page)
  await seedSavedLocation(page)
  await page.goto('/home')
  await expect(page.getByRole('article', LAUNDRY)).toBeVisible()
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined))
  await page.waitForFunction(() => localStorage.getItem('ww-forecast-cache') !== null)
}

/** Cuts the connection, and makes the external services fail as they would offline. */
async function goOffline(page: Page) {
  await page.context().setOffline(true)
  await page.unroute('https://api.open-meteo.com/**')
  await page.route('https://api.open-meteo.com/**', (route) => route.abort('internetdisconnected'))
}

test('opens offline with the last forecast and how old it is', async ({ page }) => {
  await visitOnline(page)
  await goOffline(page)
  await page.clock.setFixedTime(new Date(FIXED_NOW.getTime() + 2 * HOUR))
  await page.reload()

  await expect(page.getByRole('article', LAUNDRY)).toBeVisible()
  await expect(page.getByRole('article', { name: 'Car wash' })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'You’re offline' })).toBeVisible()
  await expect(page.getByText('Updated 2 h ago')).toBeVisible()
})

test('deep links open offline', async ({ page }) => {
  await visitOnline(page)
  await goOffline(page)
  for (const path of ['/', '/home']) {
    await page.goto(path)
    // A returning user is forwarded to /home either way.
    await expect(page.getByRole('heading', { name: 'Should you wash?' })).toBeVisible()
  }
})
