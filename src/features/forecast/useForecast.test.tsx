import { focusManager, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { delay, http, HttpResponse, type JsonBodyType } from 'msw'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '@/app/queryClient'
import { server } from '@/test/msw/server'
import { REAL_FIXTURES } from './__fixtures__/realFixtures'
import { FORECAST_ENDPOINT } from './query'
import { forecastKey, useForecast } from './useForecast'

const manila = REAL_FIXTURES.find((f) => f.meta.place === 'manila')!.response as JsonBodyType

function setup() {
  const client = createQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  let requests = 0
  server.use(
    http.get(FORECAST_ENDPOINT, async () => {
      requests++
      // The refetch is slow enough for tests to observe the in-between state.
      await delay(requests === 1 ? 20 : 300)
      return HttpResponse.json(manila)
    }),
  )
  return { client, wrapper, requests: () => requests }
}

describe('useForecast', () => {
  afterEach(() => {
    vi.useRealTimers()
    focusManager.setFocused(undefined)
  })

  it('does not fetch until both coordinates are known', async () => {
    const { wrapper, requests } = setup()
    const { result } = renderHook(() => useForecast(14.6, undefined), { wrapper })
    await new Promise((r) => setTimeout(r, 50))
    expect(result.current.fetchStatus).toBe('idle')
    expect(requests()).toBe(0)
  })

  it('fetches once and reuses the cache within 30 minutes', async () => {
    const { wrapper, requests } = setup()
    const first = renderHook(() => useForecast(14.6, 120.98), { wrapper })
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true))
    // Slightly different coordinates round to the same cache key.
    const second = renderHook(() => useForecast(14.6012, 120.9811), { wrapper })
    expect(second.result.current.data).toBe(first.result.current.data)
    expect(requests()).toBe(1)
  })

  it('after 30 minutes, a focus event refetches once and keeps the old data visible meanwhile', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const { wrapper, requests } = setup()
    const { result } = renderHook(() => useForecast(14.6, 120.98), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const firstData = result.current.data

    vi.setSystemTime(Date.now() + 31 * 60_000)
    focusManager.setFocused(false)
    focusManager.setFocused(true)

    await waitFor(() => expect(result.current.isFetching).toBe(true))
    expect(result.current.data).toBe(firstData)
    await waitFor(() => expect(result.current.isFetching).toBe(false))
    expect(requests()).toBe(2)
  })

  it('does not refetch on focus while the data is fresh', async () => {
    const { wrapper, requests } = setup()
    const { result } = renderHook(() => useForecast(14.6, 120.98), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    focusManager.setFocused(false)
    focusManager.setFocused(true)
    await new Promise((r) => setTimeout(r, 50))
    expect(requests()).toBe(1)
  })

  it('uses a stable rounded key', () => {
    expect(forecastKey(14.5995, 120.9842)).toEqual(['forecast', 14.6, 120.98])
  })
})
