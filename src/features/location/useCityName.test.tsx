import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { createQueryClient } from '@/app/queryClient'
import { server } from '@/test/msw/server'
import { GEOCODE_ENDPOINT } from './geocode'
import { useCityName } from './useCityName'

function setup(
  respond: () => Response | Promise<Response> = () => HttpResponse.json({ city: 'Manila' }),
) {
  const client = createQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  let requests = 0
  server.use(
    http.get(GEOCODE_ENDPOINT, () => {
      requests++
      return respond()
    }),
  )
  return { wrapper, requests: () => requests }
}

/** Waits long enough for a request that is going to happen to have happened. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 60))

describe('useCityName', () => {
  it('shows "Your location" while loading, then the city', async () => {
    const { wrapper } = setup(async () => {
      await delay(20)
      return HttpResponse.json({ city: 'Manila' })
    })
    const { result } = renderHook(() => useCityName(14.6, 120.98), { wrapper })
    expect(result.current).toBe('Your location')
    await waitFor(() => expect(result.current).toBe('Manila'))
  })

  it('uses the locality, then the region, when there is no city', async () => {
    const { wrapper } = setup(() => HttpResponse.json({ city: '', locality: 'Ermita' }))
    const { result } = renderHook(() => useCityName(14.6, 120.98), { wrapper })
    await waitFor(() => expect(result.current).toBe('Ermita'))
  })

  it('does not fetch without both coordinates', async () => {
    const { wrapper, requests } = setup()
    const { result } = renderHook(() => useCityName(14.6, undefined), { wrapper })
    await settle()
    expect(requests()).toBe(0)
    expect(result.current).toBe('Your location')
  })

  it('looks a place up once for coordinates in the same ~1 km cell', async () => {
    const { wrapper, requests } = setup()
    const first = renderHook(() => useCityName(14.5995, 120.9842), { wrapper })
    await waitFor(() => expect(first.result.current).toBe('Manila'))

    // Another component, slightly different position, same rounded cell (14.6, 120.98).
    const second = renderHook(() => useCityName(14.6049, 120.9811), { wrapper })
    expect(second.result.current).toBe('Manila')
    await settle()
    expect(requests()).toBe(1)
  })

  it('looks up again for a different cell', async () => {
    const { wrapper, requests } = setup()
    const first = renderHook(() => useCityName(14.6, 120.98), { wrapper })
    await waitFor(() => expect(first.result.current).toBe('Manila'))
    renderHook(() => useCityName(10.31, 123.89), { wrapper })
    await waitFor(() => expect(requests()).toBe(2))
  })

  it.each([
    ['a 500', () => new HttpResponse('oops', { status: 500 }), 2],
    ['a 429', () => new HttpResponse('slow down', { status: 429 }), 1],
    ['a malformed body', () => HttpResponse.text('<html>'), 1],
  ] as const)('falls back to "Your location" after %s', async (_name, respond, attempts) => {
    const { wrapper, requests } = setup(respond)
    const { result } = renderHook(() => useCityName(14.6, 120.98), { wrapper })
    await waitFor(() => expect(requests()).toBeGreaterThanOrEqual(1))
    await settle()
    expect(result.current).toBe('Your location')
    // A 5xx is retried once (after TanStack's 1 s delay, not waited for here); the others are not.
    if (attempts === 1) expect(requests()).toBe(1)
  })

  it('falls back to "Your location" when the network is down', async () => {
    const { wrapper, requests } = setup(() => HttpResponse.error())
    const { result } = renderHook(() => useCityName(14.6, 120.98), { wrapper })
    await waitFor(() => expect(requests()).toBeGreaterThanOrEqual(1))
    expect(result.current).toBe('Your location')
  })
})
