import { expect, test } from './fixtures'
import {
  fakeLocation,
  stubExternalServices,
  stubForecast,
  stubGeolocation,
  type GeoOutcome,
} from './support'

// The flow specs rely on the location fake behaving like a browser; this checks it first (plan R3).

const SCREENS: [GeoOutcome, string, boolean][] = [
  ['prompt', 'WashWise', false],
  ['pending', 'Finding you…', true],
  ['denied', 'Location access was denied', true],
  ['blocked', 'Location access is blocked', false],
  ['unavailable', 'We couldn’t find your location', true],
  ['timeout', 'Finding you took too long', true],
  ['unsupported', "Location isn't available in this browser", false],
]

for (const [outcome, heading, tap] of SCREENS) {
  test(`fake location "${outcome}" shows its landing screen`, async ({ page }) => {
    await stubGeolocation(page, outcome)
    await page.goto('/')
    if (tap) await page.getByRole('button', { name: 'Use my location' }).click()
    await expect(page.getByRole('heading', { name: heading })).toBeVisible()
  })
}

test('a position from the fake reaches /home and grants the permission', async ({ page }) => {
  await stubExternalServices(page)
  await stubForecast(page)
  await fakeLocation(page, {
    permission: 'prompt',
    answer: { position: { latitude: 14.6, longitude: 120.98 } },
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Use my location' }).click()
  await expect(page).toHaveURL(/\/home$/)
  expect(
    await page.evaluate(
      async () => (await navigator.permissions.query({ name: 'geolocation' })).state,
    ),
  ).toBe('granted')
})
