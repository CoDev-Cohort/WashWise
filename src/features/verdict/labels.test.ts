import { describe, expect, it } from 'vitest'
import { toOtherDaysLabel, worst } from './labels'
import type { Verdict, VerdictResult } from './types'

const ok = (verdict: Verdict): VerdictResult => ({
  status: 'ok',
  activity: 'laundry',
  verdict,
  subLabel: '',
  reasons: [],
  window: { start: 0, end: 0 },
  forTomorrow: false,
})

describe('toOtherDaysLabel', () => {
  it.each([
    ['go', 'Yes'],
    ['caution', 'Maybe'],
    ['notYet', 'Wait'],
  ] as const)('%s → %s', (verdict, label) => {
    expect(toOtherDaysLabel(ok(verdict))).toBe(label)
  })

  it('shows — when the verdict is unavailable', () => {
    expect(
      toOtherDaysLabel({ status: 'unavailable', activity: 'carWash', reason: 'missingData' }),
    ).toBe('—')
  })
})

describe('worst', () => {
  it('picks the more severe verdict', () => {
    expect(worst('go', 'caution')).toBe('caution')
    expect(worst('notYet', 'caution')).toBe('notYet')
    expect(worst('go', 'go')).toBe('go')
  })
})
