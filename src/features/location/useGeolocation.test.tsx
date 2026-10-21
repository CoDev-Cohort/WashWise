import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mockGeolocation } from '@/test/geolocation'
import { loadSavedLocation, saveLocation } from './storage'
import type { LocationStatus } from './types'
import { useGeolocation, type UseGeolocationOptions } from './useGeolocation'

/** Renders the hook and records every status it passes through. */
function setup(options?: UseGeolocationOptions) {
  const seen: LocationStatus[] = []
  const view = renderHook(() => {
    const result = useGeolocation(options)
    seen.push(result.status)
    return result
  })
  return { ...view, seen }
}

/** Lets the mount-time permission check finish. */
const settle = () => act(async () => {})

describe('useGeolocation: states (spec Story 1)', () => {
  it('starts idle and does not ask for the position (criterion 1)', async () => {
    const geo = mockGeolocation()
    const { result } = setup()
    await settle()
    expect(result.current.status).toBe('idle')
    expect(result.current.coordinates).toBeUndefined()
    expect(geo.calls).toHaveLength(0)
  })

  it('is blocked from the start when the browser already blocks the site (criterion 1)', async () => {
    mockGeolocation({ permission: 'denied' })
    const { result } = setup()
    await waitFor(() => expect(result.current.status).toBe('blocked'))
  })

  it('is requesting while the browser waits (criterion 2)', async () => {
    const geo = mockGeolocation()
    const { result } = setup()
    await settle()
    act(() => void result.current.request())
    expect(result.current.status).toBe('requesting')
    expect(geo.pending()).toBe(1)
  })

  it('is granted with rounded coordinates, saved on the device (criterion 3)', async () => {
    const geo = mockGeolocation()
    const { result } = setup()
    await settle()
    let answer: unknown
    act(() => {
      void result.current.request().then((c) => (answer = c))
    })
    await act(async () => geo.resolvePosition({ lat: 14.59951, lon: 120.98421 }))
    expect(result.current.status).toBe('granted')
    expect(result.current.coordinates).toEqual({ lat: 14.6, lon: 120.98 })
    expect(answer).toEqual({ lat: 14.6, lon: 120.98 })
    expect(loadSavedLocation()).toEqual({ lat: 14.6, lon: 120.98 })
  })

  it('is denied when the user refuses and the browser can still ask (criterion 4)', async () => {
    const geo = mockGeolocation({ permission: 'prompt' })
    const { result } = setup()
    await settle()
    act(() => void result.current.request())
    await act(async () => geo.rejectWith(1))
    expect(result.current.status).toBe('denied')
  })

  it('is blocked when the browser says it will not ask again (criterion 5)', async () => {
    const geo = mockGeolocation({ permission: 'prompt' })
    const { result } = setup()
    await settle()
    act(() => void result.current.request())
    geo.setPermission('denied') // the browser records the refusal as a block
    await act(async () => geo.rejectWith(1))
    expect(result.current.status).toBe('blocked')
  })

  it('is unavailable when the device cannot find a position (criterion 6)', async () => {
    const geo = mockGeolocation()
    const { result } = setup()
    await settle()
    act(() => void result.current.request())
    await act(async () => geo.rejectWith(2))
    expect(result.current.status).toBe('unavailable')
  })

  it('is timeout when the device does not answer in time (criterion 7)', async () => {
    const geo = mockGeolocation()
    const { result } = setup()
    await settle()
    act(() => void result.current.request())
    await act(async () => geo.rejectWith(3))
    expect(result.current.status).toBe('timeout')
  })

  it.each([
    ['the API is missing', { supported: false }],
    ['the page is not secure', { secure: false }],
  ])('is unsupported and never asks when %s (criterion 8)', async (_name, options) => {
    const geo = mockGeolocation(options)
    const { result } = setup()
    expect(result.current.status).toBe('unsupported')
    let answer: unknown = 'unset'
    await act(async () => {
      answer = await result.current.request()
    })
    expect(answer).toBeUndefined()
    expect(result.current.status).toBe('unsupported')
    expect(geo.calls).toHaveLength(0)
  })

  it('has the saved coordinates on the very first render, however old (criterion 9, FR-006a)', () => {
    mockGeolocation({ permission: 'granted' })
    saveLocation({ lat: -33.87, lon: 151.21 })
    const { result } = setup()
    expect(result.current.coordinates).toEqual({ lat: -33.87, lon: 151.21 })
    expect(result.current.status).toBe('idle')
  })

  it('works without the Permissions API', async () => {
    const geo = mockGeolocation({ permissionsApi: false })
    const { result } = setup()
    await settle()
    act(() => void result.current.request())
    await act(async () => geo.rejectWith(1))
    expect(result.current.status).toBe('denied')
  })
})

describe('useGeolocation: trying again (FR-010a)', () => {
  it('stays blocked when the browser still refuses', async () => {
    const geo = mockGeolocation({ permission: 'denied' })
    const { result } = setup()
    await waitFor(() => expect(result.current.status).toBe('blocked'))
    act(() => void result.current.request())
    expect(result.current.status).toBe('requesting')
    await act(async () => geo.rejectWith(1))
    expect(result.current.status).toBe('blocked')
  })

  it('succeeds once the user has allowed location in the browser settings', async () => {
    const geo = mockGeolocation({ permission: 'denied' })
    const { result } = setup()
    await waitFor(() => expect(result.current.status).toBe('blocked'))
    geo.setPermission('granted')
    act(() => void result.current.request())
    await act(async () => geo.resolvePosition({ lat: 1, lon: 2 }))
    expect(result.current.status).toBe('granted')
    expect(result.current.coordinates).toEqual({ lat: 1, lon: 2 })
  })

  it('recovers from unavailable on the next try', async () => {
    const geo = mockGeolocation()
    const { result } = setup()
    await settle()
    act(() => void result.current.request())
    await act(async () => geo.rejectWith(2))
    act(() => void result.current.request())
    await act(async () => geo.resolvePosition({ lat: 5, lon: 5 }))
    expect(result.current.status).toBe('granted')
  })

  it('ignores a second request while one is waiting', async () => {
    const geo = mockGeolocation()
    const { result } = setup()
    await settle()
    let second: unknown = 'unset'
    act(() => {
      void result.current.request()
      void result.current.request().then((c) => (second = c))
    })
    await settle()
    expect(geo.calls).toHaveLength(1)
    expect(second).toBeUndefined()
  })
})

describe('useGeolocation: returning user (refreshOnMount)', () => {
  const seed = () => saveLocation({ lat: 14.6, lon: 120.98 })

  it('shows granted at once and refreshes in the background without a requesting state', async () => {
    const geo = mockGeolocation({ permission: 'granted' })
    seed()
    const { result, seen } = setup({ refreshOnMount: true })
    await waitFor(() => expect(geo.pending()).toBe(1))
    expect(result.current.status).toBe('granted')

    await act(async () => geo.resolvePosition({ lat: 10.31, lon: 123.89 }))
    expect(result.current.coordinates).toEqual({ lat: 10.31, lon: 123.89 })
    expect(loadSavedLocation()).toEqual({ lat: 10.31, lon: 123.89 })
    expect(seen).not.toContain('requesting')
  })

  it('keeps the same coordinates object when the position has not changed', async () => {
    const geo = mockGeolocation({ permission: 'granted' })
    seed()
    const { result } = setup({ refreshOnMount: true })
    const before = result.current.coordinates
    await waitFor(() => expect(geo.pending()).toBe(1))
    await act(async () => geo.resolvePosition({ lat: 14.6, lon: 120.98 }))
    expect(result.current.coordinates).toBe(before)
  })

  it.each([
    ['unavailable', 2],
    ['timed out', 3],
  ] as const)('keeps the saved position when the refresh %s', async (_name, code) => {
    const geo = mockGeolocation({ permission: 'granted' })
    seed()
    const { result } = setup({ refreshOnMount: true })
    await waitFor(() => expect(geo.pending()).toBe(1))
    await act(async () => geo.rejectWith(code))
    expect(result.current.status).toBe('granted')
    expect(result.current.coordinates).toEqual({ lat: 14.6, lon: 120.98 })
  })

  it('treats a refused refresh as a revoked permission', async () => {
    const geo = mockGeolocation({ permission: 'granted' })
    seed()
    const { result } = setup({ refreshOnMount: true })
    await waitFor(() => expect(geo.pending()).toBe(1))
    await act(async () => geo.rejectWith(1))
    expect(result.current.status).toBe('denied')
  })

  it('does not refresh without the option', async () => {
    const geo = mockGeolocation({ permission: 'granted' })
    seed()
    const { result } = setup()
    await waitFor(() => expect(result.current.status).toBe('granted'))
    expect(geo.calls).toHaveLength(0)
  })

  it('does not refresh when permission has not been granted', async () => {
    const geo = mockGeolocation({ permission: 'prompt' })
    seed()
    const { result } = setup({ refreshOnMount: true })
    await settle()
    expect(result.current.status).toBe('idle')
    expect(geo.calls).toHaveLength(0)
  })

  it('stays idle when permission is granted but nothing is saved', async () => {
    const geo = mockGeolocation({ permission: 'granted' })
    const { result } = setup({ refreshOnMount: true })
    await settle()
    expect(result.current.status).toBe('idle')
    expect(geo.calls).toHaveLength(0)
  })
})

describe('useGeolocation: permission changes while the app is open', () => {
  it('becomes blocked when the permission is revoked', async () => {
    const geo = mockGeolocation({ permission: 'granted' })
    saveLocation({ lat: 1, lon: 1 })
    const { result } = setup()
    await waitFor(() => expect(result.current.status).toBe('granted'))
    act(() => geo.setPermission('denied'))
    expect(result.current.status).toBe('blocked')
  })

  it('goes back to idle when the permission is reset to "ask"', async () => {
    const geo = mockGeolocation({ permission: 'granted' })
    saveLocation({ lat: 1, lon: 1 })
    const { result } = setup()
    await waitFor(() => expect(result.current.status).toBe('granted'))
    act(() => geo.setPermission('prompt'))
    expect(result.current.status).toBe('idle')
  })
})

describe('useGeolocation: unmounting', () => {
  it('drops a late answer without errors', async () => {
    const geo = mockGeolocation()
    const { result, unmount } = setup()
    await settle()
    act(() => void result.current.request())
    unmount()
    await expect(act(async () => geo.resolvePosition({ lat: 3, lon: 3 }))).resolves.not.toThrow()
    expect(loadSavedLocation()).toEqual({ lat: 3, lon: 3 }) // still saved for next time
  })

  it('stops listening for permission changes', async () => {
    const geo = mockGeolocation({ permission: 'granted' })
    saveLocation({ lat: 1, lon: 1 })
    const { unmount } = setup()
    await settle()
    unmount()
    expect(() => geo.setPermission('denied')).not.toThrow()
  })
})
