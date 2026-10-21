import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { expectNoSeriousViolations } from '@/test/axe'
import { AppErrorBoundary } from './AppErrorBoundary'
import { ErrorFallback } from './ErrorFallback'

describe('AppErrorBoundary', () => {
  it('shows the fallback instead of a blank page, and "Try again" recovers', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    let shouldThrow = true
    function Flaky() {
      if (shouldThrow) throw new Error('boom')
      return <p>All good</p>
    }

    render(
      <AppErrorBoundary>
        <Flaky />
      </AppErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')

    shouldThrow = false
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(screen.getByText('All good')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('ErrorFallback', () => {
  it('calls onReload from the Reload button and hides "Try again" without onRetry', async () => {
    const onReload = vi.fn()
    render(<ErrorFallback onReload={onReload} />)
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reload' }))
    expect(onReload).toHaveBeenCalledOnce()
  })

  it('is a main landmark with no serious accessibility findings (P4.3 FR-001, FR-006)', async () => {
    const { container } = render(<ErrorFallback onRetry={vi.fn()} />)
    expect(screen.getByRole('main')).toContainElement(screen.getByRole('alert'))
    await expectNoSeriousViolations(container)
  })
})
