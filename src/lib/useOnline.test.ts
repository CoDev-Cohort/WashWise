import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useOnline } from './useOnline'

function goOffline(offline: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(!offline)
  window.dispatchEvent(new Event(offline ? 'offline' : 'online'))
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useOnline', () => {
  it('starts from navigator.onLine and follows online/offline events', () => {
    const { result } = renderHook(() => useOnline())
    expect(result.current).toBe(true)
    act(() => goOffline(true))
    expect(result.current).toBe(false)
    act(() => goOffline(false))
    expect(result.current).toBe(true)
  })
})
