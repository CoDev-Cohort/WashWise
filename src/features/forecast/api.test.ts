import { delay, http, HttpResponse, type JsonBodyType } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/msw/server'
import { REAL_FIXTURES } from './__fixtures__/realFixtures'
import { FORECAST_TIMEOUT_MS, fetchForecast } from './api'
import { ForecastError } from './errors'
import { FORECAST_ENDPOINT } from './query'

const manila = REAL_FIXTURES.find((f) => f.meta.place === 'manila')!.response as JsonBodyType

async function expectForecastError(promise: Promise<unknown>, kind: ForecastError['kind']) {
  const err = await promise.catch((e: unknown) => e)
  expect(err).toBeInstanceOf(ForecastError)
  expect((err as ForecastError).kind).toBe(kind)
  return err as ForecastError
}

describe('fetchForecast', () => {
  it('requests the agreed query with no API key and returns a normalized forecast', async () => {
    let url: URL | undefined
    server.use(
      http.get(FORECAST_ENDPOINT, ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json(manila)
      }),
    )
    const forecast = await fetchForecast(14.5995, 120.9842)
    expect(forecast.hourly).toHaveLength(168)
    const q = url!.searchParams
    expect(q.get('latitude')).toBe('14.6')
    expect(q.get('longitude')).toBe('120.98')
    expect(q.get('timezone')).toBe('auto')
    expect(q.get('timeformat')).toBe('unixtime')
    expect(q.get('forecast_days')).toBe('7')
    expect(q.get('wind_speed_unit')).toBe('kmh')
    expect(q.get('hourly')).toContain('precipitation_probability')
    expect(q.get('daily')).toContain('daylight_duration')
    expect([...q.keys()].some((k) => /key|token/i.test(k))).toBe(false)
  })

  it('reports a 400 with the service’s reason', async () => {
    server.use(
      http.get(FORECAST_ENDPOINT, () =>
        HttpResponse.json({ error: true, reason: 'Latitude must be in range' }, { status: 400 }),
      ),
    )
    const err = await expectForecastError(fetchForecast(999, 0), 'http')
    expect(err.status).toBe(400)
    expect(err.message).toBe('Latitude must be in range')
  })

  it('reports a 500', async () => {
    server.use(http.get(FORECAST_ENDPOINT, () => new HttpResponse('oops', { status: 500 })))
    const err = await expectForecastError(fetchForecast(0, 0), 'http')
    expect(err.status).toBe(500)
  })

  it('reports a malformed body as invalid', async () => {
    server.use(http.get(FORECAST_ENDPOINT, () => HttpResponse.text('<html>')))
    await expectForecastError(fetchForecast(0, 0), 'invalid')
  })

  it('reports a body with the wrong shape as invalid', async () => {
    server.use(http.get(FORECAST_ENDPOINT, () => HttpResponse.json({ hourly: {} })))
    await expectForecastError(fetchForecast(0, 0), 'invalid')
  })

  it('reports a network failure', async () => {
    server.use(http.get(FORECAST_ENDPOINT, () => HttpResponse.error()))
    await expectForecastError(fetchForecast(0, 0), 'network')
  })

  it('times out when there is no response', async () => {
    server.use(
      http.get(FORECAST_ENDPOINT, async () => {
        await delay('infinite')
        return HttpResponse.json(manila)
      }),
    )
    await expectForecastError(fetchForecast(0, 0, { timeoutMs: 50 }), 'timeout')
  })

  it('uses a 10 s timeout by default', () => {
    expect(FORECAST_TIMEOUT_MS).toBe(10_000)
  })

  it('passes a caller abort through instead of reporting a failure', async () => {
    server.use(
      http.get(FORECAST_ENDPOINT, async () => {
        await delay('infinite')
        return HttpResponse.json(manila)
      }),
    )
    const controller = new AbortController()
    const pending = fetchForecast(0, 0, { signal: controller.signal })
    controller.abort()
    const err = await pending.catch((e: unknown) => e)
    expect(err).not.toBeInstanceOf(ForecastError)
  })
})
