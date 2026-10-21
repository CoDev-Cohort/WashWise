import { afterEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient, FORECAST_CACHE_MAX_AGE } from '@/app/queryClient'
import { REAL_FIXTURES } from './__fixtures__/realFixtures'
import {
  FORECAST_CACHE_KEY,
  FORECAST_CACHE_VERSION,
  forecastsToPersist,
  persistForecastCache,
  restoreForecastCache,
  saveForecastCache,
} from './cachePersistence'
import { normalizeForecast } from './normalize'
import type { Forecast } from './types'
import { forecastKey } from './useForecast'

const manila = normalizeForecast(REAL_FIXTURES.find((f) => f.meta.place === 'manila')!.response)
const NOW = 1_800_000_000_000

function clientWith(...cells: [lat: number, updatedAt: number][]) {
  const client = createQueryClient()
  for (const [lat, updatedAt] of cells) {
    client.setQueryData(forecastKey(lat, 120.98), manila, { updatedAt })
  }
  return client
}

const stored = () =>
  JSON.parse(localStorage.getItem(FORECAST_CACHE_KEY)!) as {
    version: number
    state: { queries: { queryKey: unknown[] }[] }
  }

afterEach(() => vi.useRealTimers())

describe('forecast cache persistence', () => {
  it('keeps only the 3 newest successful forecasts', () => {
    const client = clientWith([1, 100], [2, 400], [3, 300], [4, 200])
    client.setQueryData(['place', 1, 2], 'Manila')
    const keep = forecastsToPersist(client)
    const kept = client
      .getQueryCache()
      .getAll()
      .filter((q) => keep.has(q.queryHash))
      .map((q) => q.queryKey[1])
    expect(kept.sort()).toEqual([2, 3, 4])
  })

  it('skips forecasts that failed and the disabled placeholder', async () => {
    const client = clientWith([1, 100])
    await client
      .prefetchQuery({
        queryKey: forecastKey(2, 120.98),
        queryFn: () => Promise.reject(new Error('nope')),
        retry: false,
      })
      .catch(() => {})
    client.setQueryData(['forecast', 'disabled'], manila)
    expect(forecastsToPersist(client).size).toBe(1)
  })

  it('saves and restores a forecast with its age', () => {
    saveForecastCache(clientWith([14.6, NOW - 60_000]))
    expect(stored().version).toBe(FORECAST_CACHE_VERSION)

    const restored = createQueryClient()
    restoreForecastCache(restored, NOW)
    expect(restored.getQueryData<Forecast>(forecastKey(14.6, 120.98))).toEqual(manila)
    expect(restored.getQueryState(forecastKey(14.6, 120.98))?.dataUpdatedAt).toBe(NOW - 60_000)
  })

  it('drops forecasts older than the max age', () => {
    saveForecastCache(clientWith([1, NOW - FORECAST_CACHE_MAX_AGE], [2, NOW - 1000]))
    const restored = createQueryClient()
    restoreForecastCache(restored, NOW)
    expect(restored.getQueryData(forecastKey(1, 120.98))).toBeUndefined()
    expect(restored.getQueryData(forecastKey(2, 120.98))).toBeDefined()
  })

  it.each([
    [
      'another version',
      JSON.stringify({ version: FORECAST_CACHE_VERSION + 1, state: { queries: [] } }),
    ],
    ['not JSON', '{'],
    ['the wrong shape', JSON.stringify({ version: FORECAST_CACHE_VERSION })],
  ])('discards a saved cache with %s', (_, raw) => {
    localStorage.setItem(FORECAST_CACHE_KEY, raw)
    const client = createQueryClient()
    restoreForecastCache(client, NOW)
    expect(client.getQueryCache().getAll()).toHaveLength(0)
    expect(localStorage.getItem(FORECAST_CACHE_KEY)).toBeNull()
  })

  it('never throws when storage is blocked', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    const client = clientWith([1, NOW])
    expect(() => saveForecastCache(client)).not.toThrow()
    expect(() => restoreForecastCache(client, NOW)).not.toThrow()
  })

  it('never throws when storage is full', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    expect(() => saveForecastCache(clientWith([1, NOW]))).not.toThrow()
  })

  it('saves a second after a forecast loads, and at once when the page is hidden', () => {
    vi.useFakeTimers()
    const client = createQueryClient()
    const stop = persistForecastCache(client)
    client.setQueryData(forecastKey(1, 120.98), manila)
    expect(localStorage.getItem(FORECAST_CACHE_KEY)).toBeNull()
    vi.advanceTimersByTime(1000)
    expect(stored().state.queries).toHaveLength(1)

    client.setQueryData(forecastKey(2, 120.98), manila)
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    expect(stored().state.queries).toHaveLength(2)
    stop()
  })

  // R2: a restored forecast skips `normalizeForecast`, so an old shape would reach the verdict engine.
  it('FORECAST_CACHE_VERSION matches the Forecast shape', () => {
    const SHAPES: Record<number, object> = {
      1: {
        forecast: [
          'daily',
          'fetchedAt',
          'hourly',
          'latitude',
          'longitude',
          'timezone',
          'utcOffsetSeconds',
        ],
        daily: [
          'date',
          'daylightDuration',
          'precipProbabilityMax',
          'precipitationSum',
          'start',
          'sunrise',
          'sunset',
          'temperatureMax',
          'temperatureMin',
          'weatherCode',
        ],
        hourly: [
          'cloudCover',
          'isDay',
          'precipProbability',
          'precipitation',
          'relativeHumidity',
          'temperature',
          'time',
          'weatherCode',
          'windSpeed',
        ],
      },
    }
    const shape = {
      forecast: Object.keys(manila).sort(),
      daily: Object.keys(manila.daily[0]!).sort(),
      hourly: Object.keys(manila.hourly[0]!).sort(),
    }
    // Failing? The saved forecast shape changed: bump FORECAST_CACHE_VERSION and add its shape here.
    expect(shape).toEqual(SHAPES[FORECAST_CACHE_VERSION])
  })
})
