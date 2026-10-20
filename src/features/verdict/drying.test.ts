import { describe, expect, it } from 'vitest'
import { at, makeForecast } from './__fixtures__/builders'
import { dryingRate, estimateDrying } from './drying'
import type { DryingEstimate } from './types'

const hoursOf = (e: DryingEstimate) => (e.kind === 'hours' ? e.hours : Infinity)

describe('estimateDrying — spec reference cases (FR-003a)', () => {
  it.each([
    [
      '25 °C, 50%, 15 km/h, clear → 2–3 h',
      { temperature: 25, relativeHumidity: 50, windSpeed: 15, cloudCover: 0 },
      2,
      3,
    ],
    [
      '18 °C, 70%, 5 km/h, mostly cloudy → 5–7 h',
      { temperature: 18, relativeHumidity: 70, windSpeed: 5, cloudCover: 75 },
      5,
      7,
    ],
  ])('%s', (_, hour, min, max) => {
    const f = makeForecast({ hour })
    const { estimate } = estimateDrying(f.hourly, at(0, 2), at(0, 23))
    expect(hoursOf(estimate)).toBeGreaterThanOrEqual(min)
    expect(hoursOf(estimate)).toBeLessThanOrEqual(max)
  })

  it('10 °C, 90%, calm, overcast → more than 8 h or tomorrow', () => {
    const f = makeForecast({
      hour: { temperature: 10, relativeHumidity: 90, windSpeed: 0, cloudCover: 100 },
    })
    expect(hoursOf(estimateDrying(f.hourly, at(0, 2), at(0, 23)).estimate)).toBeGreaterThan(8)
    expect(estimateDrying(f.hourly, at(0, 6), at(0, 18)).estimate).toEqual({ kind: 'tomorrow' })
  })
})

describe('estimateDrying — mechanics', () => {
  it('returns tomorrow when dark arrives first', () => {
    const f = makeForecast()
    expect(estimateDrying(f.hourly, at(0, 17), at(0, 18)).estimate).toEqual({ kind: 'tomorrow' })
  })

  it('starts mid-hour and interpolates the finish', () => {
    const f = makeForecast()
    const rate = dryingRate(f.hourly[0]!)!
    const { estimate } = estimateDrying(f.hourly, at(0, 9.5), at(0, 18))
    expect(hoursOf(estimate)).toBeCloseTo(1 / rate, 5)
  })

  it('carries the earlier rate, not the later one, across a missing hour', () => {
    const fast = { temperature: 25, relativeHumidity: 50, windSpeed: 15, cloudCover: 0 }
    const slow = { temperature: 18, relativeHumidity: 70, windSpeed: 5, cloudCover: 75 }
    // 09:00 fast, 10:00 missing, 11:00 on slow.
    const f = makeForecast({
      hours: (i) => (i === 9 ? fast : i === 10 ? { temperature: null } : i > 10 ? slow : undefined),
    })
    const before = dryingRate(fast)!
    const after = dryingRate(slow)!
    expect(after).toBeLessThan(before / 2) // clearly different rates
    expect(2 * before).toBeLessThan(1) // still damp when the gap ends
    const { estimate } = estimateDrying(f.hourly, at(0, 9), at(0, 23))
    // Two hours at the earlier rate, then the rest at the later one.
    expect(hoursOf(estimate)).toBeCloseTo(2 + (1 - 2 * before) / after, 5)
  })

  it('uses the next known rate when the first hours are missing', () => {
    const gap = makeForecast({ hours: (i) => (i === 9 ? { windSpeed: null } : undefined) })
    const ref = makeForecast()
    expect(hoursOf(estimateDrying(gap.hourly, at(0, 9), at(0, 18)).estimate)).toBeCloseTo(
      hoursOf(estimateDrying(ref.hourly, at(0, 9), at(0, 18)).estimate),
      5,
    )
  })

  it('reports the hours it read', () => {
    const f = makeForecast()
    const { hoursRead } = estimateDrying(f.hourly, at(0, 9), at(0, 18))
    expect(hoursRead[0]!.time).toBe(at(0, 9))
    expect(hoursRead.length).toBe(3) // finishes in the third hour (~2.5 h)
  })
})

describe('dryingRate', () => {
  it('is null when an input is missing and 0 at saturation', () => {
    expect(
      dryingRate({ temperature: null, relativeHumidity: 50, windSpeed: 0, cloudCover: 0 }),
    ).toBeNull()
    expect(
      dryingRate({ temperature: 20, relativeHumidity: 100, windSpeed: 10, cloudCover: 0 }),
    ).toBe(0)
  })
})
