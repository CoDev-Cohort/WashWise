import { delay, http, HttpResponse, type JsonBodyType } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { server } from '@/test/msw/server'
import { REAL_FIXTURES } from './__fixtures__/realFixtures'
import { FORECAST_TIMEOUT_MS, fetchForecast } from './api'
import { ForecastError } from './errors'
import { FORECAST_ENDPOINT } from './query'

const manila = REAL_FIXTURES.find((f) => f.meta.place === 'manila')!.response as JsonBodyType

/** A JSON response whose body starts but never finishes streaming. */
function stalledBody() {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('{"latitude":'))
    },
  })
  return new HttpResponse(body, {
    headers: { 'Content-Type': 'application/json', 'Content-Length': '1000' },
  })
}

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

  it('reports a connection dropped mid-body as a network failure', async () => {
    server.use(
      http.get(FORECAST_ENDPOINT, () => {
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('{"latitude":'))
            // Error after the headers are out, so it fails the body read rather than fetch().
            setTimeout(() => controller.error(new Error('terminated')), 10)
          },
        })
        return new HttpResponse(body, {
          headers: { 'Content-Type': 'application/json', 'Content-Length': '1000' },
        })
      }),
    )
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

  it('times out while the body is still streaming', async () => {
    server.use(http.get(FORECAST_ENDPOINT, () => stalledBody()))
    await expectForecastError(fetchForecast(0, 0, { timeoutMs: 50 }), 'timeout')
  })

  it('passes a caller abort during the body read through', async () => {
    // A stubbed fetch, not MSW: aborting an MSW-mocked body mid-stream can crash undici's socket
    // handling on CI runners (Node 24), which surfaced as a network error and made this test flaky.
    // This body behaves like a real one: it stalls, then errors with the abort reason.
    vi.stubGlobal('fetch', (_url: string, init?: RequestInit) => {
      const body = new ReadableStream<Uint8Array>({
        start(stream) {
          stream.enqueue(new TextEncoder().encode('{"latitude":'))
          init?.signal?.addEventListener('abort', () => stream.error(init.signal!.reason))
        },
      })
      return Promise.resolve(
        new Response(body, { headers: { 'Content-Type': 'application/json' } }),
      )
    })
    const controller = new AbortController()
    // Abort the moment the body read starts, so the abort lands in the body-read path.
    const json = Response.prototype.json
    vi.spyOn(Response.prototype, 'json').mockImplementation(function (this: Response) {
      const reading = json.call(this)
      controller.abort()
      return reading
    })
    const err = await fetchForecast(0, 0, { signal: controller.signal })
      .catch((e: unknown) => e)
      .finally(() => vi.unstubAllGlobals())
    expect(err).not.toBeInstanceOf(ForecastError)
    expect((err as Error).name).toBe('AbortError')
  })

  describe('default timeout', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('uses a 10 s timeout by default', async () => {
      expect(FORECAST_TIMEOUT_MS).toBe(10_000)
      server.use(
        http.get(FORECAST_ENDPOINT, async () => {
          await delay('infinite')
          return HttpResponse.json(manila)
        }),
      )
      // Fake only the timer withTimeout uses, so MSW keeps working.
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      const pending = fetchForecast(0, 0)
      await vi.advanceTimersByTimeAsync(FORECAST_TIMEOUT_MS - 1)
      let settled = false
      void pending.finally(() => (settled = true)).catch(() => undefined)
      await vi.advanceTimersByTimeAsync(0)
      expect(settled).toBe(false)
      await vi.advanceTimersByTimeAsync(1)
      await expectForecastError(pending, 'timeout')
    })
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
