import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { offerInstall, setIosStandalone } from '@/test/installPrompt'
import { mockMatchMedia } from '@/test/matchMedia'
import { pwaRegister } from '@/test/pwaRegister'
import { listenForInstallPrompt } from '../installPrompt'
import { PwaPrompts } from './PwaPrompts'

vi.mock('virtual:pwa-register/react', () => import('@/test/pwaRegister'))

const INSTALL = { name: 'Install WashWise' }

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/', element: <PwaPrompts /> },
      { path: '/home', element: <PwaPrompts /> },
    ],
    { initialEntries: [path] },
  )
  return render(<RouterProvider router={router} />)
}

let stop: () => void
beforeEach(() => {
  pwaRegister.reset()
  mockMatchMedia()
  stop = listenForInstallPrompt()
})
afterEach(() => {
  stop()
  sessionStorage.clear()
})

/** A returning user on a browser that offers installation. */
function returningUser(visits = 2) {
  localStorage.setItem('ww-visits', String(visits))
  offerInstall()
}

describe('PwaPrompts — update toast', () => {
  it('shows nothing when there is no update', () => {
    renderAt('/home')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows the toast when a version is waiting; Reload switches to it', async () => {
    renderAt('/')
    act(() => pwaRegister.showUpdate())
    expect(screen.getByRole('status')).toHaveTextContent('A new version is available')
    await userEvent.click(screen.getByRole('button', { name: 'Reload' }))
    expect(pwaRegister.updateServiceWorker).toHaveBeenCalledWith(true)
  })

  it('Dismiss hides it', async () => {
    renderAt('/home')
    act(() => pwaRegister.showUpdate())
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

describe('PwaPrompts — install prompt', () => {
  it('is not shown on the first visit', () => {
    returningUser(1)
    renderAt('/home')
    expect(screen.queryByRole('region', INSTALL)).not.toBeInTheDocument()
  })

  it('is shown on /home from the second visit', () => {
    returningUser()
    renderAt('/home')
    expect(screen.getByRole('region', INSTALL)).toBeInTheDocument()
  })

  it('is not shown on the landing page', () => {
    returningUser()
    renderAt('/')
    expect(screen.queryByRole('region', INSTALL)).not.toBeInTheDocument()
  })

  it('appears when the browser offers installation after the page loaded', () => {
    localStorage.setItem('ww-visits', '2')
    renderAt('/home')
    expect(screen.queryByRole('region', INSTALL)).not.toBeInTheDocument()
    act(() => void offerInstall())
    expect(screen.getByRole('region', INSTALL)).toBeInTheDocument()
  })

  it('Install opens the browser dialog and the prompt goes', async () => {
    localStorage.setItem('ww-visits', '2')
    const event = offerInstall()
    renderAt('/home')
    await userEvent.click(screen.getByRole('button', { name: 'Install' }))
    expect(event.prompt).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('region', INSTALL)).not.toBeInTheDocument()
  })

  it('"Not now" hides it for good on this device', async () => {
    returningUser()
    const { unmount } = renderAt('/home')
    await userEvent.click(screen.getByRole('button', { name: 'Not now' }))
    expect(screen.queryByRole('region', INSTALL)).not.toBeInTheDocument()
    unmount()
    renderAt('/home')
    expect(screen.queryByRole('region', INSTALL)).not.toBeInTheDocument()
  })

  it.each([
    ['an installed window', () => mockMatchMedia({ '(display-mode: standalone)': true })],
    ['the iOS home screen', () => setIosStandalone(true)],
  ])('is not shown in %s', (_, setStandalone) => {
    const restore = setStandalone()
    returningUser()
    renderAt('/home')
    expect(screen.queryByRole('region', INSTALL)).not.toBeInTheDocument()
    if (typeof restore === 'function') restore()
  })

  it('waits while the update toast shows, and comes back after Dismiss (FR-018)', async () => {
    returningUser()
    renderAt('/home')
    act(() => pwaRegister.showUpdate())
    expect(screen.getByRole('status')).toHaveTextContent('A new version is available')
    expect(screen.queryByRole('region', INSTALL)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.getByRole('region', INSTALL)).toBeInTheDocument()
  })

  it('adds scroll padding while a prompt shows, so focus never hides behind it (P4.3 FR-018)', async () => {
    returningUser()
    renderAt('/home')
    expect(document.documentElement).toHaveClass('has-bottom-prompt')
    await userEvent.click(screen.getByRole('button', { name: 'Not now' }))
    expect(document.documentElement).not.toHaveClass('has-bottom-prompt')
  })
})
