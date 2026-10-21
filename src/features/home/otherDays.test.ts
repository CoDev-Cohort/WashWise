import { describe, expect, it } from 'vitest'
import { makeForecast } from '@/features/verdict/__fixtures__/builders'
import { buildOtherDays } from './otherDays'

describe('buildOtherDays', () => {
  it('lists the days after Today and never Today itself', () => {
    const rows = buildOtherDays(makeForecast({ days: 7 }))
    expect(rows.map((r) => `${r.label} ${r.dateLabel}`)).toEqual([
      'THU 22',
      'FRI 23',
      'SAT 24',
      'SUN 25',
      'MON 26',
    ])
    expect(rows.map((r) => r.index)).toEqual([1, 2, 3, 4, 5])
  })

  it('maps Go Wash / Caution / Not yet / unavailable to Yes / Maybe / Wait / —', () => {
    const forecast = makeForecast({
      days: 7,
      hours: (i) => {
        if (i >= 24 && i < 48) return { precipProbability: 0 } // day 1: go
        if (i >= 48 && i < 72) return { precipProbability: 45 } // day 2: caution
        if (i >= 72 && i < 96) return { precipProbability: 80 } // day 3: not yet
        if (i >= 96 && i < 120) return { precipProbability: null } // day 4: unavailable
        return undefined
      },
    })
    const rows = buildOtherDays(forecast)
    expect(rows.map((r) => r.laundry)).toEqual(['Yes', 'Maybe', 'Wait', '—', 'Yes'])
    // Car wash looks 48 h ahead from each day's sunrise, so it sees the next day's rain too (and a missing day, 24 of 48 h, makes it unavailable).
    expect(rows.map((r) => r.carWash)).toEqual(['Wait', 'Wait', '—', '—', 'Yes'])
  })

  it('has fewer rows for a short forecast and none for a one-day forecast', () => {
    expect(buildOtherDays(makeForecast({ days: 3 }))).toHaveLength(2)
    expect(buildOtherDays(makeForecast({ days: 1 }))).toEqual([])
  })
})
