import { act, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { mockGeolocation, type MockGeolocationOptions } from '@/test/geolocation'
import { RequireLocation } from './RequireLocation'
import { saveLocation } from './storage'
import { useCoordinates } from './useCoordinates'

function Home() {
  const { lat, lon } = useCoordinates()
  return <p>{`Home at ${lat}, ${lon}`}</p>
}

function renderHome(browser: MockGeolocationOptions, saved = true) {
  const geo = mockGeolocation(browser)
  if (saved) saveLocation({ lat: 14.6, lon: 120.98 })
  const router = createMemoryRouter(
    [
      { path: '/', element: <p>Landing</p> },
      { element: <RequireLocation />, children: [{ path: '/home', element: <Home /> }] },
    ],
    { initialEntries: ['/home'] },
  )
  render(<RouterProvider router={router} />)
  return { geo, router }
}

describe('RequireLocation', () => {
  it('renders at once from the saved position, before anything is fetched', () => {
    renderHome({ permission: 'granted' })
    expect(screen.getByText('Home at 14.6, 120.98')).toBeInTheDocument()
  })

  it('switches to the refreshed position when it arrives', async () => {
    const { geo } = renderHome({ permission: 'granted' })
    await waitFor(() => expect(geo.pending()).toBe(1))
    await act(async () => geo.resolvePosition({ lat: 10.31, lon: 123.89 }))
    expect(screen.getByText('Home at 10.31, 123.89')).toBeInTheDocument()
  })

  it.each([
    ['unavailable', 2],
    ['timed out', 3],
  ] as const)('stays on the page when the refresh %s', async (_name, code) => {
    const { geo, router } = renderHome({ permission: 'granted' })
    await waitFor(() => expect(geo.pending()).toBe(1))
    await act(async () => geo.rejectWith(code))
    expect(screen.getByText('Home at 14.6, 120.98')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/home')
  })

  it('goes back to the landing page when the refresh is refused', async () => {
    const { geo, router } = renderHome({ permission: 'granted' })
    await waitFor(() => expect(geo.pending()).toBe(1))
    await act(async () => geo.rejectWith(1))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(screen.getByText('Landing')).toBeInTheDocument()
  })

  it('goes back to the landing page when permission is revoked while the app is open', async () => {
    const { geo, router } = renderHome({ permission: 'granted' })
    expect(screen.getByText('Home at 14.6, 120.98')).toBeInTheDocument()
    await act(async () => geo.setPermission('denied'))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })

  it('goes back to the landing page when permission is already blocked', async () => {
    const { router } = renderHome({ permission: 'denied' })
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })

  it('goes back to the landing page when no position is saved', async () => {
    const { router } = renderHome({ permission: 'granted' }, false)
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })
})

describe('useCoordinates', () => {
  it('throws a clear error outside RequireLocation', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const router = createMemoryRouter([{ path: '/', element: <Home /> }])
    render(<RouterProvider router={router} />)
    // The router's own error screen reports what a route threw.
    expect(
      screen.getAllByText(/useCoordinates must be used inside RequireLocation/).length,
    ).toBeGreaterThan(0)
  })
})
