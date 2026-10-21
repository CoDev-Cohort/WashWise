import type { PermissionResult } from '@/features/location/types'

type StubbedPermission = Exclude<PermissionResult, 'unknown'>

export interface MockGeolocationOptions {
  /** Whether `navigator.geolocation` exists. Default true. */
  supported?: boolean
  /** Value of `window.isSecureContext`. Default true. */
  secure?: boolean
  /** Whether `navigator.permissions` exists. Default true. */
  permissionsApi?: boolean
  /** Make `permissions.query` reject (older Safari). */
  queryThrows?: boolean
  /** Starting permission state. Default 'prompt'. */
  permission?: StubbedPermission
}

export interface GeolocationMock {
  /** Every `getCurrentPosition` call, with the options it received. */
  calls: PositionOptions[]
  /** Answers the oldest pending request with a position. */
  resolvePosition: (coords: { lat: number; lon: number }) => void
  /** Answers the oldest pending request with a GeolocationPositionError code (1, 2 or 3). */
  rejectWith: (code: 1 | 2 | 3) => void
  /** Changes the permission state and fires `onchange` / `change` listeners. */
  setPermission: (state: StubbedPermission) => void
  /** Number of requests still waiting for an answer. */
  pending: () => number
}

interface Pending {
  success: PositionCallback
  error?: PositionErrorCallback | null
}

const originals = new Map<object, Map<string, PropertyDescriptor | undefined>>()

function remember(target: object, key: string) {
  if (!originals.has(target)) originals.set(target, new Map())
  const saved = originals.get(target)!
  if (!saved.has(key)) saved.set(key, Object.getOwnPropertyDescriptor(target, key))
}

function define(target: object, key: string, value: unknown) {
  remember(target, key)
  Object.defineProperty(target, key, { configurable: true, writable: true, value })
}

/** Hides a property so `'key' in target` is false, as in a browser without that API. */
function hide(target: object, key: string) {
  remember(target, key)
  delete (target as Record<string, unknown>)[key]
}

/** Puts every property this helper changed back. `setup.ts` calls it after each test. */
export function restoreGeolocation() {
  for (const [target, saved] of originals) {
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(target, key, descriptor)
      else delete (target as Record<string, unknown>)[key]
    }
  }
  originals.clear()
}

/**
 * Stubs the browser location APIs for jsdom, which has none of them: `navigator.geolocation`,
 * `navigator.permissions` and `window.isSecureContext`. Requests wait until the test answers them.
 */
export function mockGeolocation({
  supported = true,
  secure = true,
  permissionsApi = true,
  queryThrows = false,
  permission = 'prompt',
}: MockGeolocationOptions = {}): GeolocationMock {
  const queue: Pending[] = []
  const calls: PositionOptions[] = []

  define(window, 'isSecureContext', secure)

  if (supported) {
    define(navigator, 'geolocation', {
      getCurrentPosition: (
        success: PositionCallback,
        error?: PositionErrorCallback | null,
        options?: PositionOptions,
      ) => {
        calls.push(options ?? {})
        queue.push({ success, error })
      },
    })
  } else {
    hide(navigator, 'geolocation')
  }

  const listeners = new Set<EventListener>()
  const status = {
    state: permission as PermissionState,
    onchange: null as ((event: Event) => void) | null,
    addEventListener: (_: string, cb: EventListener) => listeners.add(cb),
    removeEventListener: (_: string, cb: EventListener) => listeners.delete(cb),
  }

  if (permissionsApi) {
    define(navigator, 'permissions', {
      query: () =>
        queryThrows ? Promise.reject(new TypeError('Unsupported')) : Promise.resolve(status),
    })
  } else {
    hide(navigator, 'permissions')
  }

  return {
    calls,
    pending: () => queue.length,
    resolvePosition({ lat, lon }) {
      const next = queue.shift()
      next?.success({
        coords: { latitude: lat, longitude: lon, accuracy: 100 },
        timestamp: Date.now(),
      } as GeolocationPosition)
    },
    rejectWith(code) {
      const next = queue.shift()
      next?.error?.({
        code,
        message: 'mock',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError)
    },
    setPermission(state) {
      status.state = state
      const event = new Event('change')
      status.onchange?.(event)
      listeners.forEach((cb) => cb(event))
    },
  }
}
