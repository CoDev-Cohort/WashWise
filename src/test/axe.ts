import axe from 'axe-core'
import { expect } from 'vitest'

/**
 * axe on a rendered component, for states e2e can't reach cheaply (update toast, crash screen). jsdom
 * has no layout, so `color-contrast` is off; colors are covered by `src/styles/contrast.test.ts`.
 * Fails on serious or critical findings (spec FR-001); moderate/minor are left to the e2e report.
 */
export async function expectNoSeriousViolations(container: Element) {
  const results = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
  })
  const blocking = results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map(
      (v) =>
        `${v.impact} ${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`,
    )
  expect(blocking).toEqual([])
}
