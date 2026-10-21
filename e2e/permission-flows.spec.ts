import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import {
  fakeLocation,
  FIXED_NOW,
  MANILA,
  recordedFixtures,
  seedSavedLocation,
  stubExternalServices,
  stubForecast,
} from './support'

// Location permission flows (P4.4 Story 2), with the browser location faked (FR-005) and the weather
// and place-name services stubbed (FR-006). The clock is pinned inside the recorded forecast.

const START = { name: 'Use my location' }
const RETRY = { name: 'Try again' }
const HOME = { name: 'Should you wash?' }
const AT_MANILA = { position: MANILA }

async function expectHomeWithVerdicts(page: Page) {
  await expect(page).toHaveURL(/\/home$/)
  await expect(page.getByRole('heading', HOME)).toBeVisible()
  await expect(page.getByRole('article', { name: 'Laundry' })).toBeVisible()
  await expect(page.getByRole('article', { name: 'Car wash' })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await stubExternalServices(page)
  await stubForecast(page)
})

test('allowed on the first visit: home with both verdicts, and later visits skip landing (S2.1, S2.5)', async ({
  page,
}) => {
  await fakeLocation(page, { permission: 'prompt', answer: AT_MANILA })
  await page.goto('/')
  await page.getByRole('button', START).click()
  await expectHomeWithVerdicts(page)

  // A returning user never sees the landing page again (S2.5).
  await page.goto('/')
  await expectHomeWithVerdicts(page)
  await expect(page.getByRole('button', START)).toHaveCount(0)
})

test('refused, then allowed on "Try again" (S2.2)', async ({ page }) => {
  const location = await fakeLocation(page, { permission: 'prompt', answer: { error: 'denied' } })
  await page.goto('/')
  await page.getByRole('button', START).click()
  await expect(page.getByRole('heading', { name: 'Location access was denied' })).toBeVisible()

  await location.answer(AT_MANILA)
  await page.getByRole('button', RETRY).click()
  await expectHomeWithVerdicts(page)
})

test('blocked: explains browser settings and never leaves the landing page (S2.3)', async ({
  page,
}) => {
  await fakeLocation(page, { permission: 'denied', answer: { error: 'denied' } })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Location access is blocked' })).toBeVisible()
  await expect(page.getByText("Enable location in your browser's site settings")).toBeVisible()

  await page.getByRole('button', RETRY).click()
  await expect(page.getByRole('heading', { name: 'Location access is blocked' })).toBeVisible()
  await expect(page).toHaveURL(/\/$/)
})

for (const [error, heading] of [
  ['unavailable', 'We couldn’t find your location'],
  ['timeout', 'Finding you took too long'],
] as const) {
  test(`${error}, then a successful retry (S2.4)`, async ({ page }) => {
    const location = await fakeLocation(page, { permission: 'prompt', answer: { error } })
    await page.goto('/')
    await page.getByRole('button', START).click()
    await expect(page.getByRole('heading', { name: heading })).toBeVisible()

    await location.answer(AT_MANILA)
    await page.getByRole('button', RETRY).click()
    await expectHomeWithVerdicts(page)
  })
}

test('revoked while the home page is open: back to the landing page (S2.6)', async ({ page }) => {
  const location = await fakeLocation(page, { permission: 'granted', answer: AT_MANILA })
  await seedSavedLocation(page)
  await page.goto('/home')
  await expectHomeWithVerdicts(page)

  await location.permission('denied')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: 'Location access is blocked' })).toBeVisible()
})

test('the location pill moves to a new position: its forecast and place name (S2.7)', async ({
  page,
}) => {
  const london = recordedFixtures().find((f) => f.place === 'london')!
  const manila = recordedFixtures().find((f) => f.place === 'manila')!
  const isLondon = (url: string) =>
    new URL(url).searchParams.get('latitude') === String(london.position.latitude)
  // Each service answers for the position it is asked about.
  await page.route('https://api.open-meteo.com/**', (route) =>
    route.fulfill({ json: isLondon(route.request().url()) ? london.response : manila.response }),
  )
  await page.route('https://api.bigdatacloud.net/**', (route) =>
    route.fulfill({ json: { city: isLondon(route.request().url()) ? 'London' : 'Manila' } }),
  )
  await page.clock.setFixedTime(FIXED_NOW)
  const location = await fakeLocation(page, { permission: 'granted', answer: AT_MANILA })
  await seedSavedLocation(page)
  await page.goto('/home')
  await expect(page.getByRole('button', { name: 'Update location, Manila' })).toBeVisible()
  const manilaLaundry = await page.getByRole('article', { name: 'Laundry' }).textContent()

  await location.answer({ position: london.position })
  await page.getByRole('button', { name: 'Update location, Manila' }).click()
  await expect(page.getByRole('button', { name: 'Update location, London' })).toBeVisible()
  // The cards now come from London's forecast (different weather, so different pills).
  await expect(page.getByRole('article', { name: 'Laundry' })).not.toHaveText(manilaLaundry!)
})
