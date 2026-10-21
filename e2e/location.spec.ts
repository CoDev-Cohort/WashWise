import { expect, test } from './fixtures'
import { LOCATION_ALLOWED, seedSavedLocation, stubExternalServices } from './support'

const START = { name: 'Use my location' }
const HOME = { name: 'Should you wash?' }

// The first-visit flow (landing → allow → /home) is in permission-flows.spec.ts.

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
