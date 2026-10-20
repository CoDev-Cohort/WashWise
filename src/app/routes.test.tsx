import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { RouteErrorFallback } from '@/components/errors/RouteErrorFallback'
import { MobileColumn } from '@/components/layout/MobileColumn'
import { routes } from './routes'

const renderAt = (path: string) => {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

describe('routes', () => {
  it('/ renders the landing placeholder', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { name: 'WashWise' })).toBeInTheDocument()
  })

  it('/home renders the home placeholder', () => {
    renderAt('/home')
    expect(screen.getByRole('heading', { name: 'Should you wash?' })).toBeInTheDocument()
  })

  it('unknown paths redirect to /', () => {
    const router = renderAt('/nope')
    expect(router.state.location.pathname).toBe('/')
  })

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
