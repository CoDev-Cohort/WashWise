import { describe, expect, it } from 'vitest'
import { REAL_FIXTURES } from './__fixtures__/realFixtures'
import { forecastFromToday } from './fromToday'
import { normalizeForecast } from './normalize'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
// Manila is UTC+8, so local midnight differs from the device's (the test runner's) midnight.
const manila = normalizeForecast(REAL_FIXTURES.find((f) => f.meta.place === 'manila')!.response)
const day0 = manila.daily[0]!.start

describe('forecastFromToday', () => {
  it.each([
    ['fetched today, morning', day0 + 10 * HOUR, 0],
    ['last minute of the first day', day0 + DAY - 60_000, 0],
    ['first minute of the next local day', day0 + DAY, 1],
    ['fetched yesterday', day0 + DAY + 10 * HOUR, 1],
    ['fetched 6 days ago', day0 + 6 * DAY + 10 * HOUR, 6],
  ])('%s → starts at daily[%#]', (_, now, first) => {
    const result = forecastFromToday(manila, now)!
    expect(result.daily[0]).toBe(manila.daily[first])
    expect(result.daily).toHaveLength(manila.daily.length - first)
    expect(result.hourly.every((h) => h.time >= result.daily[0]!.start)).toBe(true)
    expect(result.hourly.at(-1)).toBe(manila.hourly.at(-1))
  })

  it('returns undefined once every day has ended', () => {
    expect(forecastFromToday(manila, day0 + manila.daily.length * DAY)).toBeUndefined()
  })

  it('returns the same object when nothing is dropped, and the same trimmed object on repeat', () => {
    expect(forecastFromToday(manila, day0 + HOUR)).toBe(manila)
    const now = day0 + 2 * DAY + HOUR
    expect(forecastFromToday(manila, now)).toBe(forecastFromToday(manila, now + HOUR))
  })

  it('keeps the rest of the forecast as it is', () => {
    const result = forecastFromToday(manila, day0 + DAY + HOUR)!
    expect(result).toMatchObject({
      fetchedAt: manila.fetchedAt,
      utcOffsetSeconds: manila.utcOffsetSeconds,
      timezone: manila.timezone,
    })
  })
})
