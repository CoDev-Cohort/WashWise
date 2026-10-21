import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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

/** 10:00 on the first day of the recorded Manila forecast (2026-10-21 there). */
export const FIXED_NOW = new Date('2026-10-21T02:00:00Z')

/** Answers Open-Meteo with the recorded Manila forecast and pins the browser clock next to it. */
export async function stubForecast(page: Page) {
  const body = readFileSync(
    resolve(process.cwd(), 'src/features/forecast/__fixtures__/real/manila-2026-10-20.json'),
    'utf8',
  )
  const { response } = JSON.parse(body) as { response: unknown }
  await page.clock.setFixedTime(FIXED_NOW)
  await page.route('https://api.open-meteo.com/**', (route) => route.fulfill({ json: response }))
}
