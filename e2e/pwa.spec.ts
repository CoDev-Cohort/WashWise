import { expect, test } from '@playwright/test'

interface ManifestIcon {
  src: string
  sizes: string
  purpose?: string
}

test('the manifest is linked and has what installation needs', async ({ page, request }) => {
  await page.goto('/')
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(href).toBeTruthy()

  const res = await request.get(new URL(href!, page.url()).toString())
  expect(res.ok()).toBe(true)
  const manifest = (await res.json()) as {
    name: string
    short_name: string
    display: string
    start_url: string
    theme_color: string
    icons: ManifestIcon[]
  }
  expect(manifest).toMatchObject({
    name: 'WashWise',
    short_name: 'WashWise',
    display: 'standalone',
    start_url: '/',
  })
  expect(manifest.theme_color).toBeTruthy()

  const sizes = manifest.icons.map(
    (i) => `${i.sizes}${i.purpose === 'maskable' ? ' maskable' : ''}`,
  )
  expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512', '512x512 maskable']))

  for (const icon of manifest.icons) {
    const img = await request.get(new URL(icon.src, page.url()).toString())
    expect(img.ok(), icon.src).toBe(true)
    expect(img.headers()['content-type']).toContain('image/png')
  }
})

test('iOS home-screen tags are present', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    'href',
    '/apple-touch-icon-180x180.png',
  )
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute(
    'content',
    'yes',
  )
})

test.describe('service worker', () => {
  test.use({ serviceWorkers: 'allow' })
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Playwright’s WebKit has no service workers',
  )

  test('registers and precaches the app shell', async ({ page }) => {
    await page.goto('/')
    const cached = await page.evaluate(async () => {
      await navigator.serviceWorker.ready
      const urls: string[] = []
      for (const name of await caches.keys()) {
        const cache = await caches.open(name)
        urls.push(...(await cache.keys()).map((request) => new URL(request.url).pathname))
      }
      return urls
    })
    expect(cached).toContain('/index.html')
    expect(cached.some((url) => url.endsWith('.js'))).toBe(true)
  })
})
