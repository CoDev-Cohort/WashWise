import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { InstallPrompt } from './InstallPrompt'

describe('InstallPrompt', () => {
  it('is a labelled region with Install and Not now', async () => {
    const onInstall = vi.fn()
    const onDismiss = vi.fn()
    const { container } = render(<InstallPrompt onInstall={onInstall} onDismiss={onDismiss} />)
    expect(screen.getByRole('region', { name: 'Install WashWise' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Install' }))
    await userEvent.click(screen.getByRole('button', { name: 'Not now' }))
    expect(onInstall).toHaveBeenCalledTimes(1)
    expect(onDismiss).toHaveBeenCalledTimes(1)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})
