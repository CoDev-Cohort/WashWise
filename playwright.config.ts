import { defineConfig, devices } from '@playwright/test'

const PORT = 4319

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    // A live service worker would precache during every test and race the `page.route` stubs.
    // Only the specs that test the worker opt back in with `test.use({ serviceWorkers: 'allow' })`.
    serviceWorkers: 'block',
  },
  projects: [
    { name: 'android-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'ios-safari', use: { ...devices['iPhone 14'] } },
  ],
  webServer: {
    command: `pnpm build && pnpm preview --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
