import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { StatusNotice } from './StatusNotice'

describe('StatusNotice', () => {
  it('block: an alert with one label, the hint and Try again', async () => {
    const onRetry = vi.fn()
    render(
      <StatusNotice variant="block" label="You’re offline" hint="Check it" onRetry={onRetry} />,
    )
    const alert = screen.getByRole('alert')
    expect(screen.getByRole('heading', { name: 'You’re offline' })).toBeInTheDocument()
    expect(alert).toHaveTextContent('Check it')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('banner: a polite status, not an alert', () => {
    render(<StatusNotice variant="banner" label="Couldn’t update the forecast" onRetry={vi.fn()} />)
    expect(screen.getByRole('status')).toHaveTextContent('Couldn’t update the forecast')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('hides its icons from assistive technology', () => {
    const { container } = render(<StatusNotice variant="block" label="x" onRetry={vi.fn()} />)
    const icons = container.querySelectorAll('svg')
    expect(icons.length).toBe(2)
    icons.forEach((icon) => expect(icon).toHaveAttribute('aria-hidden', 'true'))
  })

  it('is disabled and says so while retrying', async () => {
    const onRetry = vi.fn()
    render(<StatusNotice variant="banner" label="x" onRetry={onRetry} retrying />)
    const button = screen.getByRole('button', { name: 'Retrying…' })
    expect(button).toBeDisabled()
    await userEvent.click(button)
    expect(onRetry).not.toHaveBeenCalled()
  })
})
