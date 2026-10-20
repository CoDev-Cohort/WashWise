import { describe, expect, it } from 'vitest'
import { at, makeForecast } from './__fixtures__/builders'
import { computeDayVerdicts } from './days'
import { toOtherDaysLabel } from './labels'

describe('computeDayVerdicts', () => {
  it('returns one entry per day with both activities', () => {
    const days = computeDayVerdicts(makeForecast({ days: 4 }))
    expect(days.map((d) => d.date)).toEqual([
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
    ])
    expect(
      days.every((d) => d.laundry.activity === 'laundry' && d.carWash.activity === 'carWash'),
    ).toBe(true)
  })

  it('maps each day to Yes / Maybe / Wait', () => {
    const f = makeForecast({
      days: 4,
      hours: (_, t) => (t >= at(2, 0) && t < at(3, 0) ? { precipProbability: 80 } : undefined),
    })
    const days = computeDayVerdicts(f)
    expect(days.map((d) => toOtherDaysLabel(d.laundry))).toEqual(['Yes', 'Yes', 'Wait', 'Yes'])
    // Car wash looks 48 h ahead from each sunrise, so rain early on day 2 also blocks days 0 and 1.
    expect(days.map((d) => toOtherDaysLabel(d.carWash))).toEqual(['Wait', 'Wait', 'Wait', 'Yes'])
  })

  it('still gives the last day a car-wash verdict from the hours that remain', () => {
    const last = computeDayVerdicts(makeForecast({ days: 7 })).at(-1)!
    expect(last.carWash.status).toBe('ok')
  })
})
