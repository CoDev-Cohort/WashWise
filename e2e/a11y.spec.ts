import { test } from '@playwright/test'
import { scan } from './a11y/axe'
import { STATES } from './a11y/states'
import { LOCATION_ALLOWED, setTheme } from './support'

/** The full matrix runs on Chromium; WebKit runs a smoke set (plan "Resolved items"). */
const WEBKIT_SMOKE = new Set(['landing: first visit', 'home: loaded, manila'])

for (const theme of ['light', 'dark'] as const) {
  test.describe(`accessibility scan, ${theme} (P4.3 FR-001)`, () => {
    for (const state of STATES) {
      test.describe(state.name, () => {
        if (state.page === 'home') test.use(LOCATION_ALLOWED)

        test(`${state.name}, ${theme}`, async ({ page, browserName }, testInfo) => {
          test.skip(
            browserName !== 'chromium' && (state.chromiumOnly || !WEBKIT_SMOKE.has(state.name)),
            'WebKit runs the smoke set only',
          )
          // No animation mid-frame during the scan (plan R1).
          await page.emulateMedia({ reducedMotion: 'reduce' })
          await setTheme(page, theme)
          await state.setup(page)
          await scan(page, testInfo)
        })
      })
    }
  })
}
