import { expect, test, type Page } from '@playwright/test'
import {
  holdForecast,
  LOCATION_ALLOWED,
  MANILA,
  offerInstallPrompt,
  recordedFixtures,
  seedSavedLocation,
  seedVisits,
  setTheme,
  stubExternalServices,
  stubForecast,
  stubGeolocation,
  FIXED_NOW,
} from './support'

// Playwright's WebKit doesn't Tab to buttons and links by default; iOS keyboard use is checked by
// hand in the screen-reader walkthrough (plan R4).
test.skip(({ browserName }) => browserName !== 'chromium', 'Keyboard checks run on Chromium')

const HEADING = { name: 'Should you wash?' }

interface Stop {
  index: number
  name: string
  outline: string
  outlineWidth: number
}

/**
 * Tabs through the page until focus wraps, and returns each stop with its index in the DOM order of
 * visible, enabled interactive elements, so the test compares with the page itself instead of a
 * hard-coded list of names (plan R3).
 */
async function tabThrough(page: Page): Promise<{ stops: Stop[]; controls: number }> {
  const controls = await page.evaluate(() => {
    const all = [...document.querySelectorAll<HTMLElement>('button, a[href], [tabindex="0"]')]
    const visible = all.filter(
      (el) => !(el as HTMLButtonElement).disabled && el.getClientRects().length > 0,
    )
    visible.forEach((el, i) => el.setAttribute('data-kbd', String(i)))
    return visible.length
  })
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  const stops: Stop[] = []
  for (let i = 0; i < controls + 2; i++) {
    await page.keyboard.press('Tab')
    const stop = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null
      if (!el || el === document.body || !el.hasAttribute('data-kbd')) return null
      const style = getComputedStyle(el)
      return {
        index: Number(el.getAttribute('data-kbd')),
        name: el.getAttribute('aria-label') ?? el.textContent?.trim() ?? '',
        outline: style.outlineStyle,
        outlineWidth: parseFloat(style.outlineWidth),
      }
    })
    if (!stop || stops.some((s) => s.index === stop.index)) break
    stops.push(stop)
  }
  return { stops, controls }
}

function expectFullOrderWithRings(stops: Stop[], controls: number) {
  // Every control once, in DOM (= visual) order, each with a visible ring (SC-002, FR-004).
  expect(stops.map((s) => s.index)).toEqual([...Array(controls).keys()])
  for (const stop of stops) {
    expect(stop.outline, `ring on "${stop.name}"`).not.toBe('none')
    expect(stop.outlineWidth, `ring width on "${stop.name}"`).toBeGreaterThanOrEqual(2)
  }
}

async function homeLoaded(page: Page) {
  await stubExternalServices(page)
  await stubForecast(page)
  await seedSavedLocation(page)
  await page.goto('/home')
  await expect(page.getByRole('article', { name: 'Laundry' })).toBeVisible()
}

for (const theme of ['light', 'dark'] as const) {
  test.describe(`keyboard, ${theme} (P4.3 Story 2)`, () => {
    test.beforeEach(async ({ page }) => setTheme(page, theme))

    test('landing: every control in order, with a visible ring', async ({ page }) => {
      await stubGeolocation(page, 'prompt')
      await page.goto('/')
      const { stops, controls } = await tabThrough(page)
      expect(stops[0]?.name).toBe('Use my location')
      expectFullOrderWithRings(stops, controls)
    })

    test.describe('home', () => {
      test.use(LOCATION_ALLOWED)

      test('every control in order, with a visible ring', async ({ page }) => {
        await homeLoaded(page)
        const { stops, controls } = await tabThrough(page)
        expect(stops[0]?.name).toBe('Update location, Manila')
        // The last stop is the last day in the strip.
        expect(stops.at(-1)?.name).toMatch(/^[A-Z]{3}, \d+$/)
        expectFullOrderWithRings(stops, controls)
      })
    })
  })
}

test.describe('focus after actions (P4.3 FR-005, FR-009)', () => {
  test.use(LOCATION_ALLOWED)

  test('a day, the theme toggle and the location pill keep focus when used', async ({ page }) => {
    await homeLoaded(page)
    for (const name of [/^SAT/, /^Switch to dark mode$/, /^Update location/]) {
      const control = page.getByRole('button', { name })
      await control.focus()
      await page.keyboard.press('Enter')
      await expect(page.locator(':focus')).toHaveAccessibleName(
        name.source.includes('Switch') ? 'Switch to light mode' : name,
      )
    }
  })

  test('first-load "Try again" by keyboard: focus lands on the heading', async ({ page }) => {
    await stubExternalServices(page)
    const forecast = await holdForecast(page)
    await seedSavedLocation(page, MANILA)
    await page.clock.setFixedTime(FIXED_NOW)
    await page.goto('/home')
    await forecast.fail()
    const retry = page.getByRole('alert').getByRole('button', { name: 'Try again' })
    await expect(retry).toBeVisible({ timeout: 10_000 })
    await forecast.release(recordedFixtures().find((f) => f.place === 'manila')!.response)
    await retry.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', HEADING)).toBeFocused()
  })

  test('the offline banner and the install prompt never take focus', async ({ page }) => {
    await seedVisits(page)
    await homeLoaded(page)
    const day = page.getByRole('button', { name: /^SAT/ })
    await day.focus()
    await page.context().setOffline(true)
    await expect(page.getByText('You’re offline')).toBeVisible()
    await expect(day).toBeFocused()
    await page.context().setOffline(false)
    await offerInstallPrompt(page)
    await expect(page.getByRole('region', { name: 'Install WashWise' })).toBeVisible()
    await expect(day).toBeFocused()
  })
})

test.describe('landing → home by keyboard (P4.3 FR-005)', () => {
  test.use(LOCATION_ALLOWED)

  test('focus moves to the home heading and the title changes', async ({ page }) => {
    await stubExternalServices(page)
    await stubForecast(page)
    await page.goto('/')
    await expect(page).toHaveTitle('WashWise — Allow location')
    await page.getByRole('button', { name: 'Use my location' }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', HEADING)).toBeFocused()
    await expect(page).toHaveTitle('WashWise — Should you wash?')
  })
})
