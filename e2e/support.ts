import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { BrowserContextOptions, Page, Route } from '@playwright/test'

/** Manila. Rounded to 2 dp, as the app stores it. */
export const MANILA = { latitude: 14.6, longitude: 120.98 }

/** Context options for a browser where the user has already allowed location. */
export const LOCATION_ALLOWED: BrowserContextOptions = {
  permissions: ['geolocation'],
  geolocation: MANILA,
}

const SAVED_KEY = 'washwise:location:v1'

/** Pretends the user used the app before: a position is saved on the device. */
export async function seedSavedLocation(page: Page, at = MANILA) {
  await page.addInitScript(
    ([key, value]) => localStorage.setItem(key!, value!),
    [SAVED_KEY, JSON.stringify({ lat: at.latitude, lon: at.longitude })],
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

const FIXTURE_DIR = resolve(process.cwd(), 'src/features/forecast/__fixtures__/real')

export interface RecordedFixture {
  place: string
  position: { latitude: number; longitude: number }
  /** 10:00 local time on the forecast's first day, so "Today" has daylight left where there is any. */
  now: Date
  response: unknown
}

/** Every recorded Open-Meteo response, with a position and a clock that fit it. */
export function recordedFixtures(): RecordedFixture[] {
  return readdirSync(FIXTURE_DIR)
    .filter((file) => file.endsWith('.json'))
    .map((file) => {
      const { meta, response } = JSON.parse(readFileSync(resolve(FIXTURE_DIR, file), 'utf8')) as {
        meta: { place: string; lat: number; lon: number }
        response: { daily: { time: number[] } }
      }
      return {
        place: meta.place,
        position: { latitude: meta.lat, longitude: meta.lon },
        now: new Date((response.daily.time[0]! + 10 * 3600) * 1000),
        response,
      }
    })
}

/**
 * Holds every Open-Meteo request until the test answers it, so a test can look at the loading state
 * for as long as it needs. `fail()` aborts the held requests and the ones that follow, until `release`.
 */
export async function holdForecast(page: Page) {
  const held: Route[] = []
  let answer: ((route: Route) => Promise<void>) | undefined
  await page.route('https://api.open-meteo.com/**', (route) =>
    answer ? answer(route) : void held.push(route),
  )
  const flush = async () => {
    for (const route of held.splice(0)) await answer!(route)
  }
  return {
    async release(response: unknown) {
      answer = (route) => route.fulfill({ json: response })
      await flush()
    },
    async fail() {
      answer = (route) => route.abort()
      await flush()
    },
  }
}
