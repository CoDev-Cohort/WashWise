import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { saveLocation } from '@/features/location/storage'
import { mockGeolocation, type MockGeolocationOptions } from '@/test/geolocation'
import { LandingPage } from './LandingPage'

function renderLanding(options?: MockGeolocationOptions) {
  const geo = mockGeolocation(options)
  const router = createMemoryRouter(
    [
      { path: '/', element: <LandingPage /> },
      { path: '/home', element: <p>Home page</p> },
    ],
    { initialEntries: ['/'] },
  )
  render(<RouterProvider router={router} />)
  return { geo, router, user: userEvent.setup() }
}

const START = { name: 'Use my location' }
const RETRY = { name: 'Try again' }
const HINT = "Enable location in your browser's site settings"

/** Taps "Use my location" and answers the browser's request with an error code. */
async function failWith(code: 1 | 2 | 3, options?: MockGeolocationOptions) {
  const view = renderLanding(options)
  await view.user.click(await screen.findByRole('button', START))
  await act(async () => view.geo.rejectWith(code))
  return view
}

describe('LandingPage: idle', () => {
  it('shows the logo, pitch and the "Use my location" button without asking yet', async () => {
    const { geo } = renderLanding()
    expect(await screen.findByRole('heading', { level: 1, name: 'WashWise' })).toBeInTheDocument()
    expect(screen.getByText('Laundry and car-wash advice for today’s weather.')).toBeInTheDocument()
    expect(screen.getByRole('button', START)).toBeInTheDocument()
    expect(geo.calls).toHaveLength(0)
  })

  it('offers no city search or manual entry (FR-009)', async () => {
    renderLanding()
    await screen.findByRole('button', START)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('stays on the idle screen when location was allowed on an earlier visit', async () => {
    saveLocation({ lat: 14.6, lon: 120.98 })
    renderLanding({ permission: 'granted' })
    expect(await screen.findByRole('button', START)).toBeInTheDocument()
    await act(async () => {})
    expect(screen.getByRole('button', START)).toBeInTheDocument()
  })
})

describe('LandingPage: requesting and success', () => {
  it('shows a spinner and "Finding you…" while waiting', async () => {
    const { user } = renderLanding()
    await user.click(await screen.findByRole('button', START))
    expect(screen.getByRole('status')).toHaveTextContent('Finding you…')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('goes to /home when the position arrives', async () => {
    const { geo, user, router } = renderLanding()
    await user.click(await screen.findByRole('button', START))
    await act(async () => geo.resolvePosition({ lat: 14.6, lon: 120.98 }))
    expect(await screen.findByText('Home page')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/home')
  })
})

describe('LandingPage: errors', () => {
  it('denied: error and "Try again", no hint', async () => {
    await failWith(1, { permission: 'prompt' })
    expect(screen.getByRole('alert')).toHaveTextContent('Location access was denied')
    expect(screen.getByRole('button', RETRY)).toBeInTheDocument()
    expect(screen.queryByText(HINT)).not.toBeInTheDocument()
  })

  it('blocked from the start: error, "Try again" and the site-settings hint together', async () => {
    renderLanding({ permission: 'denied' })
    expect(await screen.findByRole('alert')).toHaveTextContent('Location access is blocked')
    expect(screen.getByRole('button', RETRY)).toBeInTheDocument()
    expect(screen.getByText(HINT)).toBeInTheDocument()
  })

  it('unavailable: error and "Try again"', async () => {
    await failWith(2)
    expect(screen.getByRole('alert')).toHaveTextContent('We couldn’t find your location')
    expect(screen.getByRole('button', RETRY)).toBeInTheDocument()
    expect(screen.queryByText(HINT)).not.toBeInTheDocument()
  })

  it('timeout: error and "Try again"', async () => {
    await failWith(3)
    expect(screen.getByRole('alert')).toHaveTextContent('Finding you took too long')
    expect(screen.getByRole('button', RETRY)).toBeInTheDocument()
  })

  it.each([
    ['the API is missing', { supported: false }],
    ['the page is not secure', { secure: false }],
  ])('unsupported when %s: message and no button', async (_name, options) => {
    const { geo } = renderLanding(options)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Location isn't available in this browser",
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(geo.calls).toHaveLength(0)
  })

  it('"Try again" asks the browser again and then continues to /home', async () => {
    const { geo, user, router } = await failWith(2)
    await user.click(screen.getByRole('button', RETRY))
    expect(screen.getByRole('status')).toHaveTextContent('Finding you…')
    expect(geo.calls).toHaveLength(2)
    await act(async () => geo.resolvePosition({ lat: 1, lon: 2 }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/home'))
  })

  it('blocked: "Try again" stays on the blocked screen while the browser still refuses (FR-010a)', async () => {
    const { geo, user } = renderLanding({ permission: 'denied' })
    await user.click(await screen.findByRole('button', RETRY))
    await act(async () => geo.rejectWith(1))
    expect(screen.getByRole('alert')).toHaveTextContent('Location access is blocked')
    expect(screen.getByText(HINT)).toBeInTheDocument()
  })

  it('blocked: "Try again" reaches /home once location was re-enabled in the browser (FR-010a)', async () => {
    const { geo, user, router } = renderLanding({ permission: 'denied' })
    await user.click(await screen.findByRole('button', RETRY))
    geo.setPermission('granted')
    await act(async () => geo.resolvePosition({ lat: 1, lon: 2 }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/home'))
  })
})

/** Every icon on screen is decorative: hidden from assistive technology or an empty-alt image. */
function expectIconsDecorative() {
  const icons = document.querySelectorAll('svg, img')
  expect(icons.length).toBeGreaterThan(0)
  icons.forEach((icon) => {
    const hidden = icon.closest('[aria-hidden="true"]') !== null
    expect(hidden || icon.getAttribute('alt') === '').toBe(true)
  })
}

describe('LandingPage: accessibility', () => {
  it('idle: icons are decorative', async () => {
    renderLanding()
    await screen.findByRole('button', START)
    expectIconsDecorative()
  })

  it('requesting: the spinner is decorative', async () => {
    const { user } = renderLanding()
    await user.click(await screen.findByRole('button', START))
    expectIconsDecorative()
  })

  it('error: the icon is decorative and the message is an alert', async () => {
    await failWith(1)
    expectIconsDecorative()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('unsupported: the icon is decorative', async () => {
    renderLanding({ supported: false })
    await screen.findByRole('alert')
    expectIconsDecorative()
  })

  it('every action is a real button', async () => {
    await failWith(2)
    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
