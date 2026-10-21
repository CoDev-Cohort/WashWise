import { expect, type Page, test } from '@playwright/test'
import {
  FIXED_NOW,
  holdForecast,
  LOCATION_ALLOWED,
  MANILA,
  recordedFixtures,
  seedSavedLocation,
  stubExternalServices,
} from './support'

const SECTIONS = ['strip', 'laundry', 'carWash', 'rain', 'otherDays']

/** The top and height of every section (or its placeholder), once the fonts have settled. */
async function sectionBoxes(page: Page) {
  await page.evaluate(() => document.fonts.ready)
  return page.evaluate((names) => {
    return names.map((name) => {
      const el = document.querySelector(`[data-section="${name}"]`)
      if (!el) return { name, missing: true, top: 0, height: 0 }
      const box = el.getBoundingClientRect()
      return { name, missing: false, top: box.top, height: box.height }
    })
  }, SECTIONS)
}

/** Sums layout-shift entries from now on (Chromium only; WebKit has no Layout Instability API). */
async function watchLayoutShift(page: Page) {
  return page.evaluate(() => {
    const supported = PerformanceObserver.supportedEntryTypes.includes('layout-shift')
    const w = window as unknown as { shift: number }
    w.shift = 0
    if (supported) {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as {
          value: number
          hadRecentInput: boolean
        }[]) {
          if (!entry.hadRecentInput) w.shift += entry.value
        }
      }).observe({ type: 'layout-shift' })
    }
    return supported
  })
}

test.describe('loading skeletons cause no layout shift (P4 SC-001)', () => {
  test.use(LOCATION_ALLOWED)

  for (const fixture of recordedFixtures()) {
    for (const width of [393, 430]) {
      for (const colorScheme of ['light', 'dark'] as const) {
        test(`${fixture.place} at ${width}px, ${colorScheme}`, async ({ page, context }) => {
          await page.setViewportSize({ width, height: 1600 })
          await page.emulateMedia({ colorScheme })
          await context.setGeolocation(fixture.position)
          await stubExternalServices(page)
          const forecast = await holdForecast(page)
          await seedSavedLocation(page, fixture.position)
          await page.clock.setFixedTime(fixture.now)

          await page.goto('/home')
          await expect(page.getByRole('status', { name: 'Loading forecast' })).toBeVisible()
          // The pill gets its place name first, so its width change is not part of the swap.
          await expect(page.getByRole('button', { name: 'Update location, Manila' })).toBeVisible()
          const before = await sectionBoxes(page)
          const shiftSupported = await watchLayoutShift(page)

          await forecast.release(fixture.response)
          await expect(page.getByRole('article', { name: 'Laundry' })).toBeVisible()
          const after = await sectionBoxes(page)

          for (const [i, section] of after.entries()) {
            const placeholder = before[i]!
            expect(placeholder.missing, `${section.name} placeholder`).toBe(false)
            expect(section.missing, `${section.name} section`).toBe(false)
            expect(section.top, `${section.name} top`).toBeCloseTo(placeholder.top, 0)
            expect(section.height, `${section.name} height`).toBeCloseTo(placeholder.height, 0)
          }
          if (shiftSupported) {
            expect(await page.evaluate(() => (window as unknown as { shift: number }).shift)).toBe(
              0,
            )
          }
        })
      }
    }
  }
})

test.describe('first-load error and retry (P4 Story 2)', () => {
  test.use(LOCATION_ALLOWED)

  test('a failed forecast shows the alert, and Try again by keyboard loads it', async ({
    page,
  }) => {
    await stubExternalServices(page)
    const forecast = await holdForecast(page)
    await seedSavedLocation(page, MANILA)
    await page.clock.setFixedTime(FIXED_NOW)
    await page.goto('/home')
    await forecast.fail()

    const alert = page.getByRole('alert')
    await expect(alert.getByRole('heading', { name: 'You’re offline' })).toBeVisible({
      timeout: 10_000,
    })
    const manila = recordedFixtures().find((f) => f.place === 'manila')!
    await forecast.release(manila.response)
    await alert.getByRole('button', { name: 'Try again' }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('article', { name: 'Laundry' })).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)
  })
})
