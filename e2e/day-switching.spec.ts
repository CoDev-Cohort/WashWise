import type { Locator, Page } from '@playwright/test'
// The verdict engine is pure TypeScript with relative imports, so the test computes what each day
// should show with the same code the app uses (plan R4).
import { normalizeForecast } from '../src/features/forecast/normalize'
import { computeDayVerdicts } from '../src/features/verdict'
import type { VerdictResult } from '../src/features/verdict/types'
import { expect, test } from './fixtures'
import {
  LOCATION_ALLOWED,
  recordedFixtures,
  seedSavedLocation,
  stubExternalServices,
  stubForecast,
} from './support'

// Day switching (P4.4 Story 3). The clock is pinned to 10:00 on the Manila forecast's first day.
test.use(LOCATION_ALLOWED)

const manila = recordedFixtures().find((f) => f.place === 'manila')!
const days = computeDayVerdicts(normalizeForecast(manila.response))
const STRIP = ['Today', 'THU', 'FRI', 'SAT', 'SUN', 'MON']
const TODAY_HOURS = ['10 AM', '11 AM', '12 PM', '1 PM', '2 PM']
const OTHER_DAY_HOURS = ['12 PM', '1 PM', '2 PM', '3 PM', '4 PM']

const day = (page: Page, label: string) =>
  page
    .getByRole('group', { name: 'Choose a day' })
    .getByRole('button', { name: new RegExp(`^${label}`) })

/** The chart's hours, from its screen-reader list ("10 AM: 5% chance of rain"). */
async function chartHours(page: Page) {
  const items = await page
    .getByRole('region', { name: 'Rain chance' })
    .getByRole('listitem')
    .allTextContents()
  return items.map((text) => text.split(':')[0]!.replace(' tomorrow', ''))
}

async function expectOnlySelected(page: Page, label: string) {
  const pressed = page
    .getByRole('group', { name: 'Choose a day' })
    .getByRole('button', { pressed: true })
  await expect(pressed).toHaveCount(1)
  await expect(day(page, label)).toHaveAttribute('aria-pressed', 'true')
}

async function expectCard(card: Locator, result: VerdictResult) {
  await expect(card).toContainText(result.status === 'ok' ? result.subLabel : 'Verdict unavailable')
}

test.beforeEach(async ({ page }) => {
  await stubExternalServices(page)
  await stubForecast(page)
  await seedSavedLocation(page)
  await page.goto('/home')
  await expect(page.getByRole('article', { name: 'Laundry' })).toBeVisible()
})

test('Today is selected on load and the chart shows the next 5 hours (S3.1)', async ({ page }) => {
  await expectOnlySelected(page, 'Today')
  expect(await chartHours(page)).toEqual(TODAY_HOURS)
})

test('each day updates the selection, both cards and the chart together (S3.2)', async ({
  page,
}) => {
  for (const [i, label] of STRIP.entries()) {
    if (i === 0) continue
    await day(page, label).click()
    await expectOnlySelected(page, label)
    await expectCard(page.getByRole('article', { name: 'Laundry' }), days[i]!.laundry)
    await expectCard(page.getByRole('article', { name: 'Car wash' }), days[i]!.carWash)
    expect(await chartHours(page), label).toEqual(OTHER_DAY_HOURS)
  }
})

test('days can be chosen with Enter and Space (S3.3)', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', "Playwright's WebKit doesn't Tab to buttons by default")
  await day(page, 'Today').focus()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')
  await expectOnlySelected(page, 'THU')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Space')
  await expectOnlySelected(page, 'FRI')
  await expectCard(page.getByRole('article', { name: 'Laundry' }), days[2]!.laundry)
})

test('going back to Today restores the from-now view (S3.4)', async ({ page }) => {
  const todayLaundry = await page.getByRole('article', { name: 'Laundry' }).textContent()
  await day(page, 'SAT').click()
  expect(await chartHours(page)).toEqual(OTHER_DAY_HOURS)
  await day(page, 'Today').click()
  await expectOnlySelected(page, 'Today')
  expect(await chartHours(page)).toEqual(TODAY_HOURS)
  await expect(page.getByRole('article', { name: 'Laundry' })).toHaveText(todayLaundry!)
})
