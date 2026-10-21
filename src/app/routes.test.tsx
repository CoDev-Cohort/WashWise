import { QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse, type JsonBodyType } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { RouteErrorFallback } from '@/components/errors/RouteErrorFallback'
import { MobileColumn } from '@/components/layout/MobileColumn'
import { REAL_FIXTURES } from '@/features/forecast/__fixtures__/realFixtures'
import { FORECAST_ENDPOINT } from '@/features/forecast/query'
import { GEOCODE_ENDPOINT } from '@/features/location/geocode'
import { saveLocation } from '@/features/location/storage'
import { mockGeolocation, type MockGeolocationOptions } from '@/test/geolocation'
import { server } from '@/test/msw/server'
import { createQueryClient } from './queryClient'
import { routes } from './routes'

const MANILA_FORECAST = REAL_FIXTURES.find((f) => f.meta.place === 'manila')!
  .response as JsonBodyType

/** Renders the real routes with the browser's location state set up as the test needs. */
async function renderAt(path: string, browser: MockGeolocationOptions, saved = false) {
  const geo = mockGeolocation(browser)
  if (saved) saveLocation({ lat: 14.6, lon: 120.98 })
  server.use(
    http.get(GEOCODE_ENDPOINT, () => HttpResponse.json({ city: 'Manila' })),
    http.get(FORECAST_ENDPOINT, () => HttpResponse.json(MANILA_FORECAST)),
  )
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  // The loaders are async; wait for the first navigation to settle.
  await waitFor(() => expect(router.state.initialized).toBe(true))
  return { geo, router }
}

const HOME_HEADING = { name: 'Should you wash?' }
const START = { name: 'Use my location' }

describe('routes: first visit', () => {
  it('/ shows the landing page', async () => {
    const { router } = await renderAt('/', { permission: 'prompt' })
    expect(await screen.findByRole('button', START)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })

  it('/home sends a new user to the landing page', async () => {
    const { router } = await renderAt('/home', { permission: 'prompt' })
    expect(await screen.findByRole('button', START)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })

  it('unknown paths end on the landing page', async () => {
    const { router } = await renderAt('/nope', { permission: 'prompt' })
    expect(await screen.findByRole('button', START)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })

  it('tapping "Use my location" and allowing it opens /home', async () => {
    const { geo, router } = await renderAt('/', { permission: 'prompt' })
    screen.getByRole('button', START).click()
    await waitFor(() => expect(geo.pending()).toBe(1))
    // Allowing the prompt makes the browser report "granted", which `/home`'s guard checks.
    geo.setPermission('granted')
    await act(async () => geo.resolvePosition({ lat: 14.6, lon: 120.98 }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/home'))
    expect(await screen.findByRole('heading', HOME_HEADING)).toBeInTheDocument()
  })
})

describe('routes: returning user (allowed, position saved)', () => {
  it('/ goes straight to /home without showing the landing page', async () => {
    const { router } = await renderAt('/', { permission: 'granted' }, true)
    expect(await screen.findByRole('heading', HOME_HEADING)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/home')
    expect(screen.queryByRole('button', START)).not.toBeInTheDocument()
  })

  it('/home renders at once and stays on /home after a reload', async () => {
    const { router } = await renderAt('/home', { permission: 'granted' }, true)
    expect(await screen.findByRole('heading', HOME_HEADING)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/home')
  })

  it('unknown paths end on /home', async () => {
    const { router } = await renderAt('/nope', { permission: 'granted' }, true)
    expect(await screen.findByRole('heading', HOME_HEADING)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/home')
  })

  it('/home shows the place name', async () => {
    await renderAt('/home', { permission: 'granted' }, true)
    expect(
      await screen.findByRole('button', { name: 'Update location, Manila' }),
    ).toBeInTheDocument()
  })

  it('/home still renders when the place-name lookup fails', async () => {
    mockGeolocation({ permission: 'granted' })
    saveLocation({ lat: 14.6, lon: 120.98 })
    server.use(
      http.get(GEOCODE_ENDPOINT, () => HttpResponse.error()),
      http.get(FORECAST_ENDPOINT, () => HttpResponse.json(MANILA_FORECAST)),
    )
    const router = createMemoryRouter(routes, { initialEntries: ['/home'] })
    render(
      <QueryClientProvider client={createQueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
    expect(await screen.findByRole('heading', HOME_HEADING)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Update location, Your location' }),
    ).toBeInTheDocument()
  })

  it('refreshes the position in the background without leaving /home', async () => {
    const { geo, router } = await renderAt('/home', { permission: 'granted' }, true)
    await waitFor(() => expect(geo.pending()).toBe(1))
    await act(async () => geo.resolvePosition({ lat: 10.31, lon: 123.89 }))
    expect(router.state.location.pathname).toBe('/home')
    expect(screen.getByRole('heading', HOME_HEADING)).toBeInTheDocument()
  })
})

describe('routes: revoked permission', () => {
  it('/home redirects to the landing page, which shows the blocked state', async () => {
    const { router } = await renderAt('/home', { permission: 'denied' }, true)
    expect(await screen.findByRole('alert')).toHaveTextContent('Location access is blocked')
    expect(router.state.location.pathname).toBe('/')
  })

  it('revoking while on /home ends on the landing page', async () => {
    const { geo, router } = await renderAt('/home', { permission: 'granted' }, true)
    expect(await screen.findByRole('heading', HOME_HEADING)).toBeInTheDocument()
    await act(async () => geo.setPermission('denied'))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Location access is blocked')
  })
})

describe('routes: errors', () => {
  it('a route that throws shows the fallback, not a blank page', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    function Broken(): never {
      throw new Error('boom')
    }
    const router = createMemoryRouter(
      [
        {
          element: <MobileColumn />,
          errorElement: <RouteErrorFallback />,
          children: [{ path: '/', element: <Broken /> }],
        },
      ],
      { initialEntries: ['/'] },
    )
    render(<RouterProvider router={router} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
  })
})
