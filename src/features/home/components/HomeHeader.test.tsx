import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { HomeHeader } from './HomeHeader'

describe('HomeHeader', () => {
  it('shows the logo, the pill and the toggle', () => {
    render(
      <HomeHeader
        place="Manila"
        refreshing={false}
        onRefresh={() => {}}
        theme="light"
        onToggleTheme={() => {}}
      />,
    )
    expect(screen.getByText('WashWise')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Update location, Manila' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeInTheDocument()
  })

  it('passes the refreshing state and both actions through', async () => {
    const onRefresh = vi.fn()
    const onToggleTheme = vi.fn()
    const { rerender } = render(
      <HomeHeader
        place="Your location"
        refreshing={false}
        onRefresh={onRefresh}
        theme="dark"
        onToggleTheme={onToggleTheme}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Update location, Your location' }))
    await userEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }))
    expect(onRefresh).toHaveBeenCalledTimes(1)
    expect(onToggleTheme).toHaveBeenCalledTimes(1)

    rerender(
      <HomeHeader
        place="Your location"
        refreshing
        onRefresh={onRefresh}
        theme="dark"
        onToggleTheme={onToggleTheme}
      />,
    )
    expect(screen.getByTestId('pill-spinner')).toBeInTheDocument()
  })
})
