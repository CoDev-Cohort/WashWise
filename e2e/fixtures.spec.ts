import { expect, test } from './fixtures'

// The guard must fail a test that reaches a real service (P4.4 FR-006). `test.fail()` expects the
// failure, so the suite stays green while proving the guard works.
test('an unstubbed external request fails the test', async ({ page }) => {
  test.fail()
  await page.goto('/')
  await page.evaluate(() => fetch('https://example.com/not-stubbed').catch(() => undefined))
  await expect(page.getByRole('button', { name: 'Use my location' })).toBeVisible()
})
