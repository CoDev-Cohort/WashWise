import { expect, test } from './fixtures'
import { LOCATION_ALLOWED, seedSavedLocation, stubExternalServices } from './support'

const START = { name: 'Use my location' }
const HOME = { name: 'Should you wash?' }

test.describe('first visit, then allowing location', () => {
  test.use(LOCATION_ALLOWED)

  test('landing → "Use my location" → /home, and later visits skip the landing page', async ({
    page,
  }) => {
    await stubExternalServices(page)

    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'WashWise' })).toBeVisible()
    await page.getByRole('button', START).click()
    await expect(page).toHaveURL(/\/home$/)
    await expect(page.getByRole('heading', HOME)).toBeVisible()

    // Reloading /home stays on /home.
    await page.reload()
    await expect(page).toHaveURL(/\/home$/)
    await expect(page.getByRole('heading', HOME)).toBeVisible()

    // Opening the app at / goes straight to /home: the landing page never shows.
    await page.goto('/')
    await expect(page).toHaveURL(/\/home$/)
    await expect(page.getByRole('button', START)).toHaveCount(0)
  })
})

test.describe('location allowed and a position saved', () => {
  test.use(LOCATION_ALLOWED)

  test('/home deep link renders at once', async ({ page }) => {
    await stubExternalServices(page)
    await seedSavedLocation(page)
    await page.goto('/home')
    await expect(page.getByRole('heading', HOME)).toBeVisible()
    await expect(page).toHaveURL(/\/home$/)
  })

  test('an unknown path ends on /home', async ({ page }) => {
    await stubExternalServices(page)
    await seedSavedLocation(page)
    await page.goto('/does-not-exist')
    await expect(page).toHaveURL(/\/home$/)
  })
})

test.describe('location not allowed', () => {
  test('a saved position alone does not skip the landing page: /home redirects to /', async ({
    page,
  }) => {
    await stubExternalServices(page)
    await seedSavedLocation(page)
    await page.goto('/home')
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('button', START)).toBeVisible()
  })

  test('/home with nothing saved redirects to /', async ({ page }) => {
    await stubExternalServices(page)
    await page.goto('/home')
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('button', START)).toBeVisible()
  })
})
