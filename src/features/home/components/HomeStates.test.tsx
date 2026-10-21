import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { HomeError } from './HomeError'
import { HomeSkeleton } from './HomeSkeleton'

describe('HomeSkeleton', () => {
  it('is announced as a loading status', () => {
    render(<HomeSkeleton />)
    expect(screen.getByRole('status', { name: 'Loading forecast' })).toBeInTheDocument()
  })
})

describe('HomeError', () => {
  it('is announced as an alert with a Try again button', async () => {
    const onRetry = vi.fn()
    render(<HomeError onRetry={onRetry} />)
    expect(screen.getByRole('alert')).toHaveTextContent('We couldn’t load the forecast')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
