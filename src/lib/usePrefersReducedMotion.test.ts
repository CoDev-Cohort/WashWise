import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mockMatchMedia } from '@/test/matchMedia'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

const QUERY = '(prefers-reduced-motion: reduce)'

describe('usePrefersReducedMotion', () => {
  it('reflects the setting and updates when it changes', () => {
    const media = mockMatchMedia({ [QUERY]: false })
    const { result } = renderHook(() => usePrefersReducedMotion())
    expect(result.current).toBe(false)
    act(() => media.set(QUERY, true))
    expect(result.current).toBe(true)
  })
})
