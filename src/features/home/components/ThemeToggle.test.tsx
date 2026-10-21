import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ThemeToggle } from './ThemeToggle'

describe('ThemeToggle', () => {
  it.each([
    ['light', 'Switch to dark mode'],
    ['dark', 'Switch to light mode'],
  ] as const)('in %s mode it is named "%s"', (theme, name) => {
    render(<ThemeToggle theme={theme} onToggle={() => {}} />)
    expect(screen.getByRole('button', { name })).toBeInTheDocument()
  })

  it('calls onToggle when pressed', async () => {
    const onToggle = vi.fn()
    render(<ThemeToggle theme="light" onToggle={onToggle} />)
    await userEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })
})
