import { defineConfig, devices } from '@playwright/test'

const PORT = 4319

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // One retry on CI; a test that needed it is reported as flaky, not passed (P4.4 FR-011).
  retries: process.env.CI ? 1 : 0,
  // On CI the HTML report is uploaded as an artifact; `github` adds annotations to the PR.
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
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
