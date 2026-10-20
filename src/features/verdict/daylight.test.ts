import { describe, expect, it } from 'vitest'
import { at, HOUR, makeForecast, T0 } from './__fixtures__/builders'
import {
  darkness,
  dayEnd,
  dayIndexForTime,
  getUsableDaylight,
  hoursInRange,
  hourStartAt,
} from './daylight'

describe('getUsableDaylight', () => {
  it('runs from sunrise to 1 h before sunset', () => {
    const f = makeForecast()
    expect(getUsableDaylight(f, 0)).toEqual({ start: at(0, 6), end: at(0, 17) })
  })

  it('covers the whole day on a polar day', () => {
    const f = makeForecast({ day: () => ({ sunrise: 0, sunset: 24, daylightDuration: 86_400 }) })
    expect(getUsableDaylight(f, 1)).toEqual({ start: at(1, 0), end: at(2, 0) })
  })

  it('is null on a polar night', () => {
    const f = makeForecast({ day: () => ({ sunrise: null, sunset: null, daylightDuration: 0 }) })
    expect(getUsableDaylight(f, 0)).toBeNull()
  })

  it('is null when under an hour of daylight leaves no usable time', () => {
    const f = makeForecast({ day: () => ({ sunrise: 12, sunset: 12.75 }) })
    expect(getUsableDaylight(f, 0)).toBeNull()
  })
})

describe('day bucketing', () => {
  it('handles 25 h and 23 h DST days by using the next day start', () => {
    const f = makeForecast({ days: 3, day: (i) => ({ length: [25, 23, 24][i] }) })
    expect(dayEnd(f, 0)).toBe(T0 + 25 * HOUR)
    expect(dayIndexForTime(f, T0 + 24.5 * HOUR)).toBe(0)
    expect(dayIndexForTime(f, T0 + 25 * HOUR)).toBe(1)
    expect(dayIndexForTime(f, T0 + 47.5 * HOUR)).toBe(1)
    expect(dayIndexForTime(f, T0 + 48 * HOUR)).toBe(2)
  })

  it('returns -1 outside the forecast', () => {
    const f = makeForecast({ days: 1 })
    expect(dayIndexForTime(f, T0 - 1)).toBe(-1)
    expect(dayIndexForTime(f, T0 + 24 * HOUR)).toBe(-1)
  })
})

describe('darkness', () => {
  it('is sunset normally and the end of the day on a polar day', () => {
    expect(darkness(makeForecast(), 0)).toBe(at(0, 18))
    const polar = makeForecast({
      day: () => ({ sunrise: 0, sunset: 24, daylightDuration: 86_400 }),
    })
    expect(darkness(polar, 0)).toBe(at(1, 0))
  })
})

describe('hour helpers', () => {
  const f = makeForecast({ days: 1 })

  it('hoursInRange is start-inclusive and end-exclusive', () => {
    expect(hoursInRange(f.hourly, at(0, 6), at(0, 9)).map((h) => h.time)).toEqual([
      at(0, 6),
      at(0, 7),
      at(0, 8),
    ])
  })

  it('hourStartAt floors to the containing forecast hour', () => {
    expect(hourStartAt(f.hourly, at(0, 13.67))).toBe(at(0, 13))
    expect(hourStartAt(f.hourly, at(0, 13))).toBe(at(0, 13))
  })
})
