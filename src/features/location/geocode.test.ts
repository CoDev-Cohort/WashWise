import { delay, http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { server } from '@/test/msw/server'
import {
  buildGeocodeUrl,
  FALLBACK_PLACE_NAME,
  fetchCityName,
  GEOCODE_ENDPOINT,
  GEOCODE_TIMEOUT_MS,
  GeocodeError,
  pickPlaceName,
} from './geocode'

async function expectGeocodeError(promise: Promise<unknown>, kind: GeocodeError['kind']) {
  const err = await promise.catch((e: unknown) => e)
  expect(err).toBeInstanceOf(GeocodeError)
  expect((err as GeocodeError).kind).toBe(kind)
  return err as GeocodeError
}

describe('pickPlaceName', () => {
  it.each([
    [
      'the city',
      { city: 'Manila', locality: 'Ermita', principalSubdivision: 'Metro Manila' },
      'Manila',
    ],
    [
      'the locality when there is no city',
      { city: '', locality: 'Ermita', principalSubdivision: 'Metro Manila' },
      'Ermita',
    ],
    [
      'the region when there is no city or locality',
      { city: '', locality: '', principalSubdivision: 'Metro Manila' },
      'Metro Manila',
    ],
    ['the locality when the city is blank spaces', { city: '   ', locality: 'Ermita' }, 'Ermita'],
    [
      'the region when city and locality are missing',
      { principalSubdivision: 'Svalbard' },
      'Svalbard',
    ],
    [
      'the fallback when every field is blank',
      { city: '', locality: '', principalSubdivision: '' },
      FALLBACK_PLACE_NAME,
    ],
    ['the fallback when the fields are missing', {}, FALLBACK_PLACE_NAME],
    [
      'the fallback when the fields are not strings',
      { city: 42, locality: null },
      FALLBACK_PLACE_NAME,
    ],
    ['a trimmed name', { city: '  Cebu City ' }, 'Cebu City'],
  ])('picks %s', (_name, body, expected) => {
    expect(pickPlaceName(body)).toBe(expected)
  })

  it.each([
    ['null', null],
    ['an array', []],
    ['a string', 'Manila'],
    ['a number', 7],
  ])('rejects %s as invalid', (_name, body) => {
    expect(() => pickPlaceName(body)).toThrowError(GeocodeError)
  })

  it('uses the fixed fallback text from the spec', () => {
    expect(FALLBACK_PLACE_NAME).toBe('Your location')
  })
})

describe('buildGeocodeUrl', () => {
  it('rounds to 2 dp, asks for English and sends no key', () => {
    const url = new URL(buildGeocodeUrl(14.59951, 120.98421))
    expect(url.origin + url.pathname).toBe(GEOCODE_ENDPOINT)
    expect(url.searchParams.get('latitude')).toBe('14.6')
    expect(url.searchParams.get('longitude')).toBe('120.98')
    expect(url.searchParams.get('localityLanguage')).toBe('en')
    expect([...url.searchParams.keys()].some((k) => /key|token/i.test(k))).toBe(false)
  })
})

describe('fetchCityName', () => {
  afterEach(() => vi.useRealTimers())

  it('returns the city and requests rounded coordinates', async () => {
    let url: URL | undefined
    server.use(
      http.get(GEOCODE_ENDPOINT, ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json({ city: 'Manila', locality: 'Ermita' })
      }),
    )
    await expect(fetchCityName(14.59951, 120.98421)).resolves.toBe('Manila')
    expect(url!.searchParams.get('latitude')).toBe('14.6')
    expect(url!.searchParams.get('longitude')).toBe('120.98')
  })

  it('falls back to the locality, then the region, then "Your location"', async () => {
    server.use(
      http.get(GEOCODE_ENDPOINT, () => HttpResponse.json({ city: '', locality: 'Ermita' })),
    )
    await expect(fetchCityName(1, 1)).resolves.toBe('Ermita')

    server.use(
      http.get(GEOCODE_ENDPOINT, () =>
        HttpResponse.json({ city: '', locality: '', principalSubdivision: 'Metro Manila' }),
      ),
    )
    await expect(fetchCityName(1, 1)).resolves.toBe('Metro Manila')

    server.use(http.get(GEOCODE_ENDPOINT, () => HttpResponse.json({ city: '', locality: '' })))
    await expect(fetchCityName(1, 1)).resolves.toBe('Your location')
  })

  it('reports a 500 as an http error', async () => {
    server.use(http.get(GEOCODE_ENDPOINT, () => new HttpResponse('oops', { status: 500 })))
    const err = await expectGeocodeError(fetchCityName(1, 1), 'http')
    expect(err.status).toBe(500)
  })

  it('reports a 429 (rate limited) as an http error', async () => {
    server.use(http.get(GEOCODE_ENDPOINT, () => new HttpResponse('slow down', { status: 429 })))
    const err = await expectGeocodeError(fetchCityName(1, 1), 'http')
    expect(err.status).toBe(429)
  })

  it('reports a malformed body as invalid', async () => {
    server.use(http.get(GEOCODE_ENDPOINT, () => HttpResponse.text('<html>')))
    await expectGeocodeError(fetchCityName(1, 1), 'invalid')
  })

  it('reports a body that is not an object as invalid', async () => {
    server.use(http.get(GEOCODE_ENDPOINT, () => HttpResponse.json([1, 2, 3])))
    await expectGeocodeError(fetchCityName(1, 1), 'invalid')
  })

  it('reports a network failure', async () => {
    server.use(http.get(GEOCODE_ENDPOINT, () => HttpResponse.error()))
    await expectGeocodeError(fetchCityName(1, 1), 'network')
  })

  it('times out when there is no response', async () => {
    server.use(
      http.get(GEOCODE_ENDPOINT, async () => {
        await delay('infinite')
        return HttpResponse.json({ city: 'Manila' })
      }),
    )
    await expectGeocodeError(fetchCityName(1, 1, { timeoutMs: 50 }), 'timeout')
  })

  it('passes a caller abort through without calling it a failure', async () => {
    server.use(
      http.get(GEOCODE_ENDPOINT, async () => {
        await delay('infinite')
        return HttpResponse.json({ city: 'Manila' })
      }),
    )
    const controller = new AbortController()
    const pending = fetchCityName(1, 1, { signal: controller.signal })
    setTimeout(() => controller.abort(), 20)
    const err = await pending.catch((e: unknown) => e)
    expect(err).not.toBeInstanceOf(GeocodeError)
  })

  it('uses a 10 s timeout by default', async () => {
    expect(GEOCODE_TIMEOUT_MS).toBe(10_000)
    server.use(
      http.get(GEOCODE_ENDPOINT, async () => {
        await delay('infinite')
        return HttpResponse.json({ city: 'Manila' })
      }),
    )
    // Fake only the timer withTimeout uses, so MSW keeps working.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const pending = fetchCityName(1, 1).catch((e: unknown) => e)
    await vi.advanceTimersByTimeAsync(GEOCODE_TIMEOUT_MS - 1)
    let settled = false
    void pending.then(() => (settled = true))
    await Promise.resolve()
    expect(settled).toBe(false)
    await vi.advanceTimersByTimeAsync(2)
    const err = await pending
    expect(err).toBeInstanceOf(GeocodeError)
    expect((err as GeocodeError).kind).toBe('timeout')
  })
})
