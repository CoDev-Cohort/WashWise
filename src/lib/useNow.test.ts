import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useNow } from './useNow'

describe('useNow', () => {
  afterEach(() => vi.useRealTimers())

  it('starts at the current time and ticks on the interval', () => {
    vi.useFakeTimers({ now: 1_000 })
    const { result } = renderHook(() => useNow(60_000))
    expect(result.current).toBe(1_000)
    act(() => vi.advanceTimersByTime(60_000))
    expect(result.current).toBe(61_000)
  })

  it('stops ticking after unmount', () => {
    vi.useFakeTimers({ now: 0 })
    const { unmount } = renderHook(() => useNow(1_000))
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
