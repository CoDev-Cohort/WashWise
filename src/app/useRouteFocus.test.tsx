import { act, render, screen } from '@testing-library/react'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { useRouteFocus } from './useRouteFocus'

function Layout() {
  useRouteFocus()
  return <Outlet />
}

const page = (title: string) => (
  <main>
    <h1 tabIndex={-1}>{title}</h1>
    <button type="button">Go</button>
  </main>
)

function renderRouter(initialEntries: string[]) {
  const router = createMemoryRouter(
    [
      {
        element: <Layout />,
        children: [
          { path: '/', element: page('Landing') },
          { path: '/home', element: page('Home') },
        ],
      },
    ],
    { initialEntries },
  )
  render(<RouterProvider router={router} />)
  return router
}

describe('useRouteFocus', () => {
  it('leaves focus alone on the first render', () => {
    renderRouter(['/home'])
    expect(document.body).toHaveFocus()
  })

  it('focuses the new page heading after landing → home', async () => {
    const router = renderRouter(['/'])
    screen.getByRole('button', { name: 'Go' }).focus()
    await act(() => router.navigate('/home', { replace: true }))
    expect(screen.getByRole('heading', { name: 'Home' })).toHaveFocus()
  })

  it('focuses the landing heading when sent back (permission revoked)', async () => {
    const router = renderRouter(['/home'])
    await act(() => router.navigate('/', { replace: true }))
    expect(screen.getByRole('heading', { name: 'Landing' })).toHaveFocus()
  })
})
