import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { pwaRegister } from '@/test/pwaRegister'
import { UPDATE_CHECK_INTERVAL_MS, useAppUpdate } from './useAppUpdate'

vi.mock('virtual:pwa-register/react', () => import('@/test/pwaRegister'))

function setVisibility(state: DocumentVisibilityState) {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(state)
  document.dispatchEvent(new Event('visibilitychange'))
}

beforeEach(() => pwaRegister.reset())
afterEach(() => vi.useRealTimers())

describe('useAppUpdate', () => {
  it('shows nothing until a new version is waiting', () => {
    const { result } = renderHook(() => useAppUpdate())
    expect(result.current.visible).toBe(false)
    act(() => pwaRegister.showUpdate())
    expect(result.current.visible).toBe(true)
  })

  it('reload switches to the waiting version', () => {
    const { result } = renderHook(() => useAppUpdate())
    act(() => pwaRegister.showUpdate())
    act(() => result.current.reload())
    expect(pwaRegister.updateServiceWorker).toHaveBeenCalledWith(true)
  })

  it('checks for a new version every hour', () => {
    vi.useFakeTimers()
    renderHook(() => useAppUpdate())
    expect(pwaRegister.registration.update).not.toHaveBeenCalled()
    vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS)
    expect(pwaRegister.registration.update).toHaveBeenCalledTimes(1)
  })

  it('checks when the app comes back to the foreground, not when it goes away', () => {
    renderHook(() => useAppUpdate())
    act(() => setVisibility('hidden'))
    expect(pwaRegister.registration.update).not.toHaveBeenCalled()
    act(() => setVisibility('visible'))
    expect(pwaRegister.registration.update).toHaveBeenCalledTimes(1)
  })

  it('does not check while offline', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    renderHook(() => useAppUpdate())
    act(() => setVisibility('visible'))
    expect(pwaRegister.registration.update).not.toHaveBeenCalled()
  })

  it('a dismissed toast stays hidden until the next check, then comes back', () => {
    const { result } = renderHook(() => useAppUpdate())
    act(() => pwaRegister.showUpdate())
    act(() => result.current.dismiss())
    expect(result.current.visible).toBe(false)
    act(() => setVisibility('visible'))
    expect(result.current.visible).toBe(true)
  })
})
