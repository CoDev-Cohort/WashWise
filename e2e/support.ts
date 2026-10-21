import type { BrowserContextOptions, Page } from '@playwright/test'

/** Manila. Rounded to 2 dp, as the app stores it. */
export const MANILA = { latitude: 14.6, longitude: 120.98 }

/** Context options for a browser where the user has already allowed location. */
export const LOCATION_ALLOWED: BrowserContextOptions = {
  permissions: ['geolocation'],
  geolocation: MANILA,
}

const SAVED_KEY = 'washwise:location:v1'

/** Pretends the user used the app before: a position is saved on the device. */
export async function seedSavedLocation(page: Page) {
  await page.addInitScript(
    ([key, value]) => localStorage.setItem(key!, value!),
    [SAVED_KEY, JSON.stringify({ lat: MANILA.latitude, lon: MANILA.longitude })],
  )
}

/** E2E never uses the network: external services answer from here. */
export async function stubExternalServices(page: Page) {
  await page.route('https://api.bigdatacloud.net/**', (route) =>
    route.fulfill({
      json: { city: 'Manila', locality: 'Ermita', principalSubdivision: 'Metro Manila' },
    }),
  )
  await page.route('https://api.open-meteo.com/**', (route) => route.abort())
}
