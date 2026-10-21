import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { expectNoSeriousViolations } from '@/test/axe'
import { UpdateToast } from './UpdateToast'

describe('UpdateToast', () => {
  it('announces the update and offers Reload and Dismiss', async () => {
    const onReload = vi.fn()
    const onDismiss = vi.fn()
    const { container } = render(<UpdateToast onReload={onReload} onDismiss={onDismiss} />)
    expect(screen.getByRole('status')).toHaveTextContent('A new version is available')
    await userEvent.click(screen.getByRole('button', { name: 'Reload' }))
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(onReload).toHaveBeenCalledTimes(1)
    expect(onDismiss).toHaveBeenCalledTimes(1)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('has no serious accessibility findings (P4.3 FR-001)', async () => {
    const { container } = render(<UpdateToast onReload={vi.fn()} onDismiss={vi.fn()} />)
    await expectNoSeriousViolations(container)
  })
})
