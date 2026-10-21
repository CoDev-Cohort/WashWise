import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LocationPill } from './LocationPill'

describe('LocationPill', () => {
  it('shows the place and is named by it', () => {
    render(<LocationPill place="Manila" refreshing={false} onRefresh={() => {}} />)
    const button = screen.getByRole('button', { name: 'Update location, Manila' })
    expect(button).toHaveTextContent('Manila')
    expect(screen.queryByTestId('pill-spinner')).not.toBeInTheDocument()
  })

  it('calls onRefresh once when pressed', async () => {
    const onRefresh = vi.fn()
    render(<LocationPill place="Manila" refreshing={false} onRefresh={onRefresh} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('shows a spinner and cannot be pressed while refreshing', async () => {
    const onRefresh = vi.fn()
    render(<LocationPill place="Manila" refreshing onRefresh={onRefresh} />)
    expect(screen.getByTestId('pill-spinner')).toBeInTheDocument()
    const button = screen.getByRole('button', { name: 'Update location, Manila' })
    // aria-disabled, not disabled: keyboard focus stays on it (P4.3 FR-005)
    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(button).toHaveAttribute('aria-busy', 'true')
    await userEvent.click(button)
    expect(onRefresh).not.toHaveBeenCalled()
  })
})
