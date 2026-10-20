import { afterEach, describe, expect, it, vi } from 'vitest'
import { POLAR_PLACES, REAL_FIXTURES } from './__fixtures__/realFixtures'
import { ForecastError } from './errors'
import { localDate, normalizeForecast } from './normalize'

describe('normalizeForecast — contract over real fixtures', () => {
  describe.each(REAL_FIXTURES.map((f) => [f.meta.place, f] as const))('%s', (place, fixture) => {
    const forecast = normalizeForecast(fixture.response)

    it('has 7 days of hourly and daily data', () => {
      expect(forecast.hourly).toHaveLength(168)
      expect(forecast.daily).toHaveLength(7)
    })

    it('has strictly increasing day starts', () => {
      for (let i = 1; i < forecast.daily.length; i++) {
        expect(forecast.daily[i]!.start).toBeGreaterThan(forecast.daily[i - 1]!.start)
      }
    })

    it('puts every hour in exactly one day', () => {
      const starts = forecast.daily.map((d) => d.start)
      const end = starts.at(-1)! + 86_400_000
      for (const h of forecast.hourly) {
        const matches = starts.filter((s, i) => h.time >= s && h.time < (starts[i + 1] ?? end))
        expect(matches).toHaveLength(1)
      }
    })

    it.skipIf(POLAR_PLACES.has(place))('has ≤ 5% missing rain probability', () => {
      const missing = forecast.hourly.filter((h) => h.precipProbability === null).length
      expect(missing / forecast.hourly.length).toBeLessThanOrEqual(0.05)
    })

    it('converts times to epoch ms', () => {
      expect(forecast.hourly[0]!.time).toBeGreaterThan(1_700_000_000_000)
      expect(forecast.daily[0]!.sunrise ?? forecast.daily[0]!.start).toBeGreaterThan(
        1_700_000_000_000,
      )
    })
  })
})

describe('local dates', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("uses the location's offset, not the browser's time zone", () => {
    vi.stubEnv('TZ', 'America/New_York')
    const manila = REAL_FIXTURES.find((f) => f.meta.place === 'manila')!
    const forecast = normalizeForecast(manila.response)
    // Manila day 0 starts at local midnight 2026-10-21 (+08:00), which is still 10-20 in New York.
    expect(forecast.daily.map((d) => d.date)).toEqual([
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
      '2026-10-26',
      '2026-10-27',
    ])
  })

  it('formats an instant in a fixed offset', () => {
    expect(localDate(Date.UTC(2026, 9, 20, 17, 0), 8 * 3600)).toBe('2026-10-21')
    expect(localDate(Date.UTC(2026, 9, 20, 3, 0), -7 * 3600)).toBe('2026-10-19')
  })
})

describe('invalid responses', () => {
  const valid = REAL_FIXTURES[0]!.response as Record<string, unknown>

  it.each([
    ['null', null],
    ['an error body', { error: true, reason: 'Invalid latitude' }],
    ['a missing daily block', { ...valid, daily: undefined }],
    [
      'mismatched array lengths',
      { ...valid, hourly: { ...(valid.hourly as object), temperature_2m: [1, 2] } },
    ],
  ])('rejects %s', (_, raw) => {
    expect(() => normalizeForecast(raw)).toThrow(ForecastError)
    try {
      normalizeForecast(raw)
    } catch (e) {
      expect((e as ForecastError).kind).toBe('invalid')
    }
  })

  it('maps null values to null and is_day to booleans', () => {
    const raw = structuredClone(valid) as { hourly: Record<string, (number | null)[]> }
    raw.hourly.precipitation_probability![0] = null
    raw.hourly.is_day![0] = 0
    raw.hourly.is_day![1] = 1
    const f = normalizeForecast(raw)
    expect(f.hourly[0]!.precipProbability).toBeNull()
    expect(f.hourly[0]!.isDay).toBe(false)
    expect(f.hourly[1]!.isDay).toBe(true)
  })
})
