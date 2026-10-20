import { expect, test } from '@playwright/test'

test('/ renders the landing placeholder', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'WashWise' })).toBeVisible()
})

test('/home renders the home placeholder (deep link)', async ({ page }) => {
  await page.goto('/home')
  await expect(page.getByRole('heading', { name: 'Should you wash?' })).toBeVisible()
})

test('unknown paths redirect to /', async ({ page }) => {
  await page.goto('/does-not-exist')
  await expect(page).toHaveURL(/\/$/)
})

test('content stays in a column no wider than 430 px on a desktop viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  const box = await page.getByTestId('mobile-column').boundingBox()
  expect(box!.width).toBeLessThanOrEqual(430)
  expect(Math.round(box!.x + box!.width / 2)).toBe(640)
})
