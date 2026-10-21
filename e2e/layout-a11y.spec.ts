import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import {
  holdForecast,
  LOCATION_ALLOWED,
  offerInstallPrompt,
  seedSavedLocation,
  seedVisits,
  setTheme,
  stubExternalServices,
  stubForecast,
  stubGeolocation,
  FIXED_NOW,
} from './support'

async function homeLoaded(page: Page) {
  await stubExternalServices(page)
  await stubForecast(page)
  await seedSavedLocation(page)
  await page.goto('/home')
  await expect(page.getByRole('article', { name: 'Laundry' })).toBeVisible()
}

async function landing(page: Page) {
  await stubGeolocation(page, 'prompt')
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Use my location' })).toBeVisible()
}

/** Width and height of every visible button and link. */
const targetSizes = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('button, a[href]')]
      .filter((el) => el.getClientRects().length > 0)
      .map((el) => {
        const r = el.getBoundingClientRect()
        return {
          name: el.getAttribute('aria-label') ?? el.textContent?.trim(),
          w: r.width,
          h: r.height,
        }
      }),
  )

test.describe('layout accessibility (P4.3 Story 4)', () => {
  test.use(LOCATION_ALLOWED)

  // Each page in its own test: the landing location stub would otherwise stay on for home.
  const PAGES = [
    ['landing', landing],
    ['home', homeLoaded],
  ] as const

  for (const [pageName, open] of PAGES) {
    for (const width of [393, 320]) {
      test(`${pageName}: targets are at least 24 × 24 px at ${width} px (FR-016)`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 900 })
        await open(page)
        for (const target of await targetSizes(page)) {
          expect(target.w, `${target.name} width`).toBeGreaterThanOrEqual(24)
          expect(target.h, `${target.name} height`).toBeGreaterThanOrEqual(24)
        }
      })
    }

    for (const theme of ['light', 'dark'] as const) {
      test(`${pageName}: reflows at 320 px with nothing clipped, ${theme} (FR-011)`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width: 320, height: 900 })
        await setTheme(page, theme)
        await open(page)
        const layout = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          clipped: [...document.querySelectorAll<HTMLElement>('button, a[href]')]
            .filter((el) => el.getClientRects().length > 0)
            .filter((el) => {
              const r = el.getBoundingClientRect()
              return r.left < 0 || r.right > window.innerWidth
            })
            .map((el) => el.getAttribute('aria-label') ?? el.textContent),
          // Content cut off inside a control (e.g. a day name wider than its button).
          overflowing: [...document.querySelectorAll<HTMLElement>('button, a[href]')]
            .filter((el) => el.getClientRects().length > 0 && el.scrollWidth > el.clientWidth + 1)
            .map((el) => el.getAttribute('aria-label') ?? el.textContent),
        }))
        expect(layout.overflow).toBeLessThanOrEqual(0)
        expect(layout.clipped).toEqual([])
        expect(layout.overflowing).toEqual([])
        await testInfo.attach(`320px-${theme}-${pageName}.png`, {
          body: await page.screenshot({ fullPage: true }),
          contentType: 'image/png',
        })
      })
    }
  }

  test('forced colors: bars, the selected day and focus stay visible (FR-017)', async ({
    page,
    browserName,
  }, testInfo) => {
    test.skip(browserName !== 'chromium', 'Forced-colors emulation is Chromium-only')
    await page.emulateMedia({ forcedColors: 'active' })
    await homeLoaded(page)
    const styles = await page.evaluate(() => {
      const bar = document.querySelector<HTMLElement>('[data-section="rain"] ul li span span')
      const days = [...document.querySelectorAll<HTMLElement>('[data-section="strip"] button')]
      const width = (el: HTMLElement) => getComputedStyle(el).borderTopWidth
      return {
        bar: bar ? getComputedStyle(bar).backgroundColor : 'missing',
        selected: width(days.find((d) => d.getAttribute('aria-pressed') === 'true')!),
        other: width(days.find((d) => d.getAttribute('aria-pressed') === 'false')!),
      }
    })
    expect(styles.bar).not.toMatch(/rgba\(0, 0, 0, 0\)|transparent|missing/)
    expect(styles.selected).not.toBe(styles.other)

    await page.getByRole('button', { name: /^SAT/ }).focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    const outline = await page.evaluate(
      () => getComputedStyle(document.activeElement!).outlineStyle,
    )
    expect(outline).not.toBe('none')
    await testInfo.attach('forced-colors-home.png', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    })
  })

  test('reduced motion: no animation runs (FR-012)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const running = () => page.evaluate(() => document.getAnimations().length)

    await stubGeolocation(page, 'pending')
    await page.goto('/')
    await page.getByRole('button', { name: 'Use my location' }).click()
    await expect(page.getByRole('heading', { name: 'Finding you…' })).toBeVisible()
    expect(await running(), 'landing spinner').toBe(0)
  })

  test('reduced motion: the skeleton and the pill spinner stay still (FR-012)', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await stubExternalServices(page)
    const forecast = await holdForecast(page)
    await seedSavedLocation(page)
    await page.clock.setFixedTime(FIXED_NOW)
    await page.goto('/home')
    await expect(page.getByRole('status', { name: 'Loading forecast' })).toBeVisible()
    expect(await page.evaluate(() => document.getAnimations().length), 'skeleton').toBe(0)
    await forecast.fail()
  })

  test('a focused control is never hidden behind the install prompt (FR-018)', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 700 })
    await seedVisits(page)
    await homeLoaded(page)
    await offerInstallPrompt(page)
    const prompt = page.getByRole('region', { name: 'Install WashWise' })
    await expect(prompt).toBeVisible()

    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab')
      const hidden = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null
        const slot = document.querySelector('[aria-label="Install WashWise"]')
        if (!el || !slot || slot.contains(el) || el === document.body) return null
        const r = el.getBoundingClientRect()
        const p = slot.getBoundingClientRect()
        return { name: el.getAttribute('aria-label') ?? el.textContent, covered: r.top >= p.top }
      })
      if (hidden) expect(hidden.covered, `${hidden.name} is behind the prompt`).toBe(false)
    }
  })
})
