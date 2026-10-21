import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, type TestInfo } from '@playwright/test'

/** WCAG 2.2 AA (spec FR-016), every level up to it. */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

/** Best-practice rules behind spec FR-006 (one main, one h1, heading order, content in landmarks). */
const STRUCTURE_RULES = ['landmark-one-main', 'page-has-heading-one', 'heading-order', 'region']

const BLOCKING = new Set(['serious', 'critical'])

/**
 * Runs axe on the page as it is now and fails on any serious or critical finding (spec FR-001, FR-002).
 * Moderate and minor findings are logged and attached, not failed (FR-019). Callers emulate reduced
 * motion and wait for their state's own element first, so nothing is mid-transition (plan R1).
 */
export async function scan(page: Page, testInfo: TestInfo) {
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
  const wcag = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  const structure = await new AxeBuilder({ page }).withRules(STRUCTURE_RULES).analyze()
  const violations = [...wcag.violations, ...structure.violations]

  await testInfo.attach('axe-violations.json', {
    body: JSON.stringify(violations, null, 2),
    contentType: 'application/json',
  })
  const describe = (v: (typeof violations)[number]) =>
    `${v.impact} ${v.id}: ${v.help}\n${v.nodes.map((n) => `    ${n.target.join(' ')}`).join('\n')}`

  const minor = violations.filter((v) => !BLOCKING.has(v.impact ?? ''))
  if (minor.length > 0) console.log(`[axe] ${testInfo.title}\n${minor.map(describe).join('\n')}`)

  // Structure rules are best-practice (impact "moderate" at most), so they fail on any finding.
  const blocking = [
    ...wcag.violations.filter((v) => BLOCKING.has(v.impact ?? '')),
    ...structure.violations,
  ]
  expect(blocking.map(describe), 'serious or critical accessibility findings').toEqual([])
}
