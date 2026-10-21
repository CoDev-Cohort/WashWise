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

  it('banner: the meta line shows but is outside the live region, so updates are not re-announced', () => {
    render(
      <StatusNotice
        variant="banner"
        label="You’re offline"
        meta="Updated 2 h ago"
        onRetry={vi.fn()}
      />,
    )
    expect(screen.getByText('Updated 2 h ago')).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent('You’re offline')
    expect(screen.getByRole('status')).not.toHaveTextContent('Updated')
  })

  it('hides its icons from assistive technology', () => {
    const { container } = render(<StatusNotice variant="block" label="x" onRetry={vi.fn()} />)
    const icons = container.querySelectorAll('svg')
    expect(icons.length).toBe(2)
    icons.forEach((icon) => expect(icon).toHaveAttribute('aria-hidden', 'true'))
  })

  it('is disabled and says so while retrying, and keeps focus (P4.3 FR-005)', async () => {
    const onRetry = vi.fn()
    render(<StatusNotice variant="banner" label="x" onRetry={onRetry} retrying />)
    const button = screen.getByRole('button', { name: 'Retrying…' })
    expect(button).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(button)
    expect(onRetry).not.toHaveBeenCalled()
    expect(button).toHaveFocus()
  })
})
