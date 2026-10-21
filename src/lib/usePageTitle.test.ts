import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { usePageTitle } from './usePageTitle'

describe('usePageTitle', () => {
  it('sets the document title, and updates it when it changes', () => {
    const { rerender } = renderHook(({ title }) => usePageTitle(title), {
      initialProps: { title: 'WashWise — Allow location' },
    })
    expect(document.title).toBe('WashWise — Allow location')
    rerender({ title: 'WashWise — Should you wash?' })
    expect(document.title).toBe('WashWise — Should you wash?')
  })
})
