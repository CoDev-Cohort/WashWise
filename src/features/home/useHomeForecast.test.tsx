import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { delay, http, HttpResponse, type JsonBodyType } from 'msw'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '@/app/queryClient'
import { REAL_FIXTURES } from '@/features/forecast/__fixtures__/realFixtures'
import { GENERIC, OFFLINE } from '@/features/forecast/errorLabel'
import { normalizeForecast } from '@/features/forecast/normalize'
import { FORECAST_ENDPOINT } from '@/features/forecast/query'
import { forecastKey } from '@/features/forecast/useForecast'
import type { Coordinates } from '@/features/location/types'
import { server } from '@/test/msw/server'
import { useHomeForecast } from './useHomeForecast'

const manila = REAL_FIXTURES.find((f) => f.meta.place === 'manila')!.response as JsonBodyType
const MANILA = { lat: 14.6, lon: 120.98 }
const CEBU = { lat: 10.31, lon: 123.89 }
const HOUR = 3_600_000
/** 10:00 in Manila on the recorded forecast's first day. */
const NOW = normalizeForecast(manila).daily[0]!.start + 10 * HOUR

function setOnline(online: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online)
  window.dispatchEvent(new Event(online ? 'online' : 'offline'))
}

afterEach(() => {
  vi.restoreAllMocks()
  onlineManager.setOnline(true)
})

/** A client holding the Manila forecast as if restored from the device, fetched `age` ms before NOW. */
function restoredClient(age = 2 * HOUR) {
  const client = createQueryClient()
  client.setQueryData(forecastKey(MANILA.lat, MANILA.lon), normalizeForecast(manila, NOW - age), {
    updatedAt: NOW - age,
  })
  return client
}

function renderForecast(initial: Coordinates, client: QueryClient = createQueryClient()) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return renderHook(({ coords }) => useHomeForecast(coords, NOW), {
    wrapper,
    initialProps: { coords: initial },
  })
}

describe('useHomeForecast', () => {
  it('keeps the last forecast when the new cell fails, and says which place it is for', async () => {
    server.use(
      http.get(FORECAST_ENDPOINT, ({ request }) =>
        new URL(request.url).searchParams.get('latitude') === String(CEBU.lat)
          ? new HttpResponse('nope', { status: 400 })
          : HttpResponse.json(manila),
      ),
    )
    const { result, rerender } = renderForecast(MANILA)
    await waitFor(() => expect(result.current.view.kind).toBe('ready'))
    const loaded = result.current.view.kind === 'ready' ? result.current.view.data : undefined

    rerender({ coords: CEBU })
    await waitFor(() => expect(result.current.copy).toBe(GENERIC))
    expect(result.current.view).toMatchObject({
      kind: 'ready',
      data: loaded,
      stale: true,
      previousLocation: true,
    })
    expect(result.current.shownCoords).toEqual(MANILA)
  })

  it('a second retry while one runs joins it instead of sending another request', async () => {
    let requests = 0
    let fail = true
    server.use(
      http.get(FORECAST_ENDPOINT, async () => {
        requests++
        await delay(30)
        return fail ? new HttpResponse('nope', { status: 400 }) : HttpResponse.json(manila)
      }),
    )
    const { result } = renderForecast(MANILA)
    await waitFor(() => expect(result.current.view.kind).toBe('error'))
    expect(requests).toBe(1)

    fail = false
    act(() => {
      result.current.retry()
      result.current.retry()
    })
    await waitFor(() => expect(result.current.view.kind).toBe('ready'))
    expect(requests).toBe(2)
  })

  describe('offline (4.2)', () => {
    it('shows the restored forecast at once, marked offline, without waiting for the network', () => {
      setOnline(false)
      const { result } = renderForecast(MANILA, restoredClient())
      expect(result.current.view).toMatchObject({ kind: 'ready', stale: true, reason: 'offline' })
      expect(result.current.copy).toBe(OFFLINE)
    })

    it('offline in a new cell shows the newest restored forecast and its place (FR-016)', () => {
      setOnline(false)
      const { result } = renderForecast(CEBU, restoredClient())
      expect(result.current.view).toMatchObject({
        kind: 'ready',
        stale: true,
        reason: 'offline',
        previousLocation: true,
      })
      expect(result.current.shownCoords).toEqual(MANILA)
    })

    it('offline with nothing cached shows the offline error, not a skeleton', () => {
      setOnline(false)
      const { result } = renderForecast(MANILA)
      expect(result.current.view.kind).toBe('error')
      expect(result.current.copy).toBe(OFFLINE)
    })

    it('refetches when the connection comes back and clears the offline state (FR-007)', async () => {
      let requests = 0
      server.use(
        http.get(FORECAST_ENDPOINT, () => {
          requests++
          return HttpResponse.json(manila)
        }),
      )
      setOnline(false)
      const { result } = renderForecast(MANILA, restoredClient())
      expect(result.current.view).toMatchObject({ stale: true })

      act(() => setOnline(true))
      await waitFor(() => expect(result.current.view).toMatchObject({ stale: false }))
      expect(requests).toBe(1)
      expect(result.current.copy).toBeUndefined()
    })

    it('online, a restored forecast shows at once while a fresh one loads, with no stale state', () => {
      server.use(
        http.get(FORECAST_ENDPOINT, async () => {
          await delay('infinite')
          return HttpResponse.json(manila)
        }),
      )
      const { result } = renderForecast(MANILA, restoredClient())
      expect(result.current.view).toMatchObject({ kind: 'ready', stale: false })
      expect(result.current.isFetching).toBe(true)
    })
  })
})
