import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockMatchMedia } from '@/test/matchMedia'
import { DARK_QUERY, readTheme, THEME_KEY } from './themeStorage'
import { useTheme } from './useTheme'

afterEach(() => {
  vi.restoreAllMocks()
  document.documentElement.className = ''
  document.documentElement.removeAttribute('style')
})

describe('useTheme', () => {
  it('follows the system setting when nothing is saved', () => {
    mockMatchMedia({ [DARK_QUERY]: true })
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')
    expect(document.documentElement).toHaveClass('dark')
  })

  it('toggles, saves the choice and keeps it after a remount', () => {
    mockMatchMedia({ [DARK_QUERY]: false })
    const first = renderHook(() => useTheme())
    act(() => first.result.current.toggle())
    expect(first.result.current.theme).toBe('dark')
    expect(readTheme()).toBe('dark')
    first.unmount()

    const second = renderHook(() => useTheme())
    expect(second.result.current.theme).toBe('dark')
    expect(document.documentElement).toHaveClass('dark')
    act(() => second.result.current.toggle())
    expect(second.result.current.theme).toBe('light')
    expect(document.documentElement).not.toHaveClass('dark')
  })

  it('follows a system change only while no choice is saved', () => {
    const media = mockMatchMedia({ [DARK_QUERY]: false })
    const { result } = renderHook(() => useTheme())
    act(() => media.set(DARK_QUERY, true))
    expect(result.current.theme).toBe('dark')

    act(() => result.current.toggle()) // the user picks light
    act(() => media.set(DARK_QUERY, false))
    act(() => media.set(DARK_QUERY, true))
    expect(result.current.theme).toBe('light')
  })

  it('ignores a corrupt saved value', () => {
    mockMatchMedia({ [DARK_QUERY]: false })
    localStorage.setItem(THEME_KEY, 'purple')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('light')
  })

  it('still toggles when storage is blocked', () => {
    mockMatchMedia({ [DARK_QUERY]: false })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const { result } = renderHook(() => useTheme())
    act(() => result.current.toggle())
    expect(result.current.theme).toBe('dark')
  })
})
