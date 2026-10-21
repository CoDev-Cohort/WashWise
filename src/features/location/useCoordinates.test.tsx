import { QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse, type JsonBodyType } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { createQueryClient } from '@/app/queryClient'
import { REAL_FIXTURES } from '@/features/forecast/__fixtures__/realFixtures'
import { FORECAST_ENDPOINT } from '@/features/forecast/query'
import { useForecast } from '@/features/forecast/useForecast'
import { mockGeolocation } from '@/test/geolocation'
import { server } from '@/test/msw/server'
import { RequireLocation } from './RequireLocation'
import { saveLocation } from './storage'
import { useCoordinates, useLocationRefresh } from './useCoordinates'

const manila = REAL_FIXTURES.find((f) => f.meta.place === 'manila')!.response as JsonBodyType

function Probe() {
  const { lat, lon } = useCoordinates()
  const { refresh, refreshing } = useLocationRefresh()
  const forecast = useForecast(lat, lon)
  return (
    <>
      <p>{`At ${lat}, ${lon}`}</p>
      <p>{forecast.data ? 'Forecast ready' : 'No forecast'}</p>
      <button type="button" onClick={() => void refresh()}>
        {refreshing ? 'Refreshing' : 'Refresh'}
      </button>
    </>
  )
}

async function setup() {
  const geo = mockGeolocation({ permission: 'granted' })
  saveLocation({ lat: 14.6, lon: 120.98 })
  let requests = 0
  server.use(
    http.get(FORECAST_ENDPOINT, async () => {
      requests++
      await delay(5)
      return HttpResponse.json(manila)
    }),
  )
  const router = createMemoryRouter(
    [
      { path: '/', element: <p>Landing</p> },
      { element: <RequireLocation />, children: [{ path: '/home', element: <Probe /> }] },
    ],
    { initialEntries: ['/home'] },
  )
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  // The quiet refresh on mount asks for the position once; answer it with the same cell.
  await waitFor(() => expect(geo.pending()).toBe(1))
  await act(async () => geo.resolvePosition({ lat: 14.6, lon: 120.98 }))
  await screen.findByText('Forecast ready')
  return { geo, router, requests: () => requests }
}

describe('useLocationRefresh', () => {
  it('in the same ~1 km cell it asks the forecast again', async () => {
    const { geo, requests } = await setup()
    const before = requests()
    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    await waitFor(() => expect(geo.pending()).toBe(1))
    expect(screen.getByRole('button', { name: 'Refreshing' })).toBeInTheDocument()
    await act(async () => geo.resolvePosition({ lat: 14.6, lon: 120.98 }))
    await waitFor(() => expect(requests()).toBe(before + 1))
    expect(await screen.findByRole('button', { name: 'Refresh' })).toBeInTheDocument()
  })

  it('in a new cell it switches to the new position and fetches its forecast', async () => {
    const { geo, requests } = await setup()
    const before = requests()
    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    await waitFor(() => expect(geo.pending()).toBe(1))
    await act(async () => geo.resolvePosition({ lat: 10.31, lon: 123.89 }))
    expect(await screen.findByText('At 10.31, 123.89')).toBeInTheDocument()
    await waitFor(() => expect(requests()).toBeGreaterThan(before))
    expect(screen.getByText('Forecast ready')).toBeInTheDocument()
  })

  it('keeps the position and the forecast when the request fails', async () => {
    const { geo, router, requests } = await setup()
    const before = requests()
    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    await waitFor(() => expect(geo.pending()).toBe(1))
    await act(async () => geo.rejectWith(3))
    expect(await screen.findByRole('button', { name: 'Refresh' })).toBeInTheDocument()
    expect(screen.getByText('At 14.6, 120.98')).toBeInTheDocument()
    expect(screen.getByText('Forecast ready')).toBeInTheDocument()
    expect(requests()).toBe(before)
    expect(router.state.location.pathname).toBe('/home')
  })

  it('leaves for the landing page when the refresh is refused and permission is gone', async () => {
    const { geo, router } = await setup()
    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    await waitFor(() => expect(geo.pending()).toBe(1))
    geo.setPermission('denied')
    await act(async () => geo.rejectWith(1))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })

  it('starts only one refresh when tapped twice', async () => {
    const { geo } = await setup()
    const button = screen.getByRole('button', { name: 'Refresh' })
    await userEvent.click(button)
    await userEvent.click(screen.getByRole('button', { name: 'Refreshing' }))
    await waitFor(() => expect(geo.pending()).toBe(1))
    await act(async () => geo.resolvePosition({ lat: 14.6, lon: 120.98 }))
    await screen.findByRole('button', { name: 'Refresh' })
  })
})
