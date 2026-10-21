import { expect, type Page } from '@playwright/test'
import {
  FIXED_NOW,
  holdForecast,
  MANILA,
  offerInstallPrompt,
  recordedFixtures,
  seedSavedLocation,
  seedVisits,
  stubExternalServices,
  stubForecast,
  stubGeolocation,
  type GeoOutcome,
} from '../support'

export interface A11yState {
  name: string
  /** Landing states replace the browser location APIs; home states need location allowed. */
  page: 'landing' | 'home'
  /** Chromium only (needs `context.setOffline`, which WebKit handles differently). */
  chromiumOnly?: boolean
  /** Puts the page in the state and waits until it is fully shown (plan R1). */
  setup: (page: Page) => Promise<void>
}

const START = { name: 'Use my location' }

function landing(name: string, outcome: GeoOutcome, expectText: string, tap = true): A11yState {
  return {
    name: `landing: ${name}`,
    page: 'landing',
    async setup(page) {
      await stubGeolocation(page, outcome)
      await page.goto('/')
      if (tap) await page.getByRole('button', START).click()
      await expect(page.getByRole('heading', { name: expectText })).toBeVisible()
    },
  }
}

/** The home page with the recorded Manila forecast. */
async function homeLoaded(page: Page) {
  await stubExternalServices(page)
  await stubForecast(page)
  await seedSavedLocation(page)
  await page.goto('/home')
  await expect(page.getByRole('article', { name: 'Laundry' })).toBeVisible()
}

export const STATES: A11yState[] = [
  landing('first visit', 'prompt', 'WashWise', false),
  landing('finding you', 'pending', 'Finding you…'),
  landing('denied', 'denied', 'Location access was denied'),
  landing('blocked', 'blocked', 'Location access is blocked', false),
  landing('unavailable', 'unavailable', 'We couldn’t find your location'),
  landing('timeout', 'timeout', 'Finding you took too long'),
  landing('unsupported', 'unsupported', "Location isn't available in this browser", false),
  {
    name: 'home: loading',
    page: 'home',
    async setup(page) {
      await stubExternalServices(page)
      await holdForecast(page)
      await seedSavedLocation(page)
      await page.clock.setFixedTime(FIXED_NOW)
      await page.goto('/home')
      await expect(page.getByRole('status', { name: 'Loading forecast' })).toBeVisible()
    },
  },
  // Every recorded place: between them they cover Go Wash, Caution, Not yet and unavailable.
  ...recordedFixtures().map((fixture): A11yState => ({
    name: `home: loaded, ${fixture.place}`,
    page: 'home',
    async setup(page) {
      await page.context().setGeolocation(fixture.position)
      await stubExternalServices(page)
      await seedSavedLocation(page, fixture.position)
      await page.clock.setFixedTime(fixture.now)
      await page.route('https://api.open-meteo.com/**', (route) =>
        route.fulfill({ json: fixture.response }),
      )
      await page.goto('/home')
      await expect(page.getByRole('article', { name: 'Laundry' })).toBeVisible()
    },
  })),
  {
    name: 'home: another day selected',
    page: 'home',
    async setup(page) {
      await homeLoaded(page)
      await page.getByRole('button', { name: /^SAT/ }).click()
      await expect(page.getByRole('button', { name: /^SAT/ })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
    },
  },
  {
    name: 'home: first-load error',
    page: 'home',
    async setup(page) {
      await stubExternalServices(page)
      await seedSavedLocation(page, MANILA)
      await page.clock.setFixedTime(FIXED_NOW)
      await page.goto('/home')
      await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 })
    },
  },
  {
    name: 'home: update-failed banner',
    page: 'home',
    async setup(page) {
      await homeLoaded(page)
      await page.unroute('https://api.open-meteo.com/**')
      await page.route('https://api.open-meteo.com/**', (route) =>
        route.fulfill({ status: 500, json: { reason: 'down' } }),
      )
      await page.getByRole('button', { name: /^Update location/ }).click()
      await expect(page.getByText('Couldn’t update the forecast')).toBeVisible({ timeout: 10_000 })
    },
  },
  {
    name: 'home: offline banner',
    page: 'home',
    chromiumOnly: true,
    async setup(page) {
      await homeLoaded(page)
      await page.context().setOffline(true)
      await expect(page.getByText('You’re offline')).toBeVisible()
    },
  },
  {
    name: 'home: install prompt',
    page: 'home',
    async setup(page) {
      await seedVisits(page)
      await homeLoaded(page)
      await offerInstallPrompt(page)
      await expect(page.getByRole('region', { name: 'Install WashWise' })).toBeVisible()
    },
  },
]
