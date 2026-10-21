import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { delay, http, HttpResponse, type JsonBodyType } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { createQueryClient } from '@/app/queryClient'
import { REAL_FIXTURES } from '@/features/forecast/__fixtures__/realFixtures'
import { GENERIC } from '@/features/forecast/errorLabel'
import { FORECAST_ENDPOINT } from '@/features/forecast/query'
import type { Coordinates } from '@/features/location/types'
import { server } from '@/test/msw/server'
import { useHomeForecast } from './useHomeForecast'

const manila = REAL_FIXTURES.find((f) => f.meta.place === 'manila')!.response as JsonBodyType
const MANILA = { lat: 14.6, lon: 120.98 }
const CEBU = { lat: 10.31, lon: 123.89 }

function renderForecast(initial: Coordinates) {
  const client = createQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return renderHook(({ coords }) => useHomeForecast(coords), {
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
})
