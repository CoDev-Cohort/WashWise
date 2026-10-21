import { describe, expect, it, vi } from 'vitest'
import { mockGeolocation } from '@/test/geolocation'
import { LocationError } from './errors'
import {
  getPosition,
  isGeolocationSupported,
  LOCATION_TIMEOUT_MS,
  queryPermission,
  watchPermission,
} from './geolocation'

describe('isGeolocationSupported', () => {
  it('is true with the API on a secure page', () => {
    mockGeolocation()
    expect(isGeolocationSupported()).toBe(true)
  })

  it('is false when the API is missing', () => {
    mockGeolocation({ supported: false })
    expect(isGeolocationSupported()).toBe(false)
  })

  it('is false on a page that is not secure', () => {
    mockGeolocation({ secure: false })
    expect(isGeolocationSupported()).toBe(false)
  })
})

describe('getPosition', () => {
  it('resolves with coordinates rounded to 2 dp', async () => {
    const geo = mockGeolocation()
    const result = getPosition()
    geo.resolvePosition({ lat: 14.59951, lon: 120.98421 })
    await expect(result).resolves.toEqual({ lat: 14.6, lon: 120.98 })
  })

  it('asks for a coarse, 10 s, up-to-5-minute-old fix', async () => {
    const geo = mockGeolocation()
    const result = getPosition()
    geo.resolvePosition({ lat: 1, lon: 1 })
    await result
    expect(geo.calls).toEqual([
      { enableHighAccuracy: false, timeout: LOCATION_TIMEOUT_MS, maximumAge: 300_000 },
    ])
    expect(LOCATION_TIMEOUT_MS).toBe(10_000)
  })

  it.each([
    [1, 'denied'],
    [2, 'unavailable'],
    [3, 'timeout'],
  ] as const)('maps error code %i to "%s"', async (code, kind) => {
    const geo = mockGeolocation()
    const result = getPosition()
    geo.rejectWith(code)
    await expect(result).rejects.toMatchObject({ name: 'LocationError', kind })
  })

  it('rejects as unavailable, without asking, when location is not supported', async () => {
    const geo = mockGeolocation({ supported: false })
    const error = await getPosition().catch((e: unknown) => e)
    expect(error).toBeInstanceOf(LocationError)
    expect(error).toMatchObject({ kind: 'unavailable' })
    expect(geo.calls).toHaveLength(0)
  })
})

describe('queryPermission', () => {
  it.each(['granted', 'denied', 'prompt'] as const)('reports "%s"', async (permission) => {
    mockGeolocation({ permission })
    await expect(queryPermission()).resolves.toBe(permission)
  })

  it('gives "unknown" when the Permissions API is missing', async () => {
    mockGeolocation({ permissionsApi: false })
    await expect(queryPermission()).resolves.toBe('unknown')
  })

  it('gives "unknown" when the query throws', async () => {
    mockGeolocation({ queryThrows: true })
    await expect(queryPermission()).resolves.toBe('unknown')
  })
})

describe('watchPermission', () => {
  it('reports changes until unsubscribed', async () => {
    const geo = mockGeolocation({ permission: 'granted' })
    const onChange = vi.fn()
    const stop = watchPermission(onChange)
    await new Promise((resolve) => setTimeout(resolve, 0)) // let the subscription attach
    geo.setPermission('denied')
    expect(onChange).toHaveBeenLastCalledWith('denied')

    stop()
    geo.setPermission('prompt')
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('does nothing when the Permissions API is missing', () => {
    mockGeolocation({ permissionsApi: false })
    const stop = watchPermission(vi.fn())
    expect(() => stop()).not.toThrow()
  })

  it('ignores a subscription that was cancelled before the query finished', async () => {
    const geo = mockGeolocation({ permission: 'granted' })
    const onChange = vi.fn()
    watchPermission(onChange)()
    await Promise.resolve()
    geo.setPermission('denied')
    expect(onChange).not.toHaveBeenCalled()
  })
})
