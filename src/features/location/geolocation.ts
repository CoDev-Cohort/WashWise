import { roundCoord } from '@/features/forecast/query'
import { LocationError } from './errors'
import type { Coordinates, LocationErrorKind, PermissionResult } from './types'

/** FR-005: no position after 10 s is a timeout. Browsers don't count time spent on the prompt. */
export const LOCATION_TIMEOUT_MS = 10_000

/** Weather needs about 1 km, so a coarse and fast fix is enough. A fix up to 5 min old is fine. */
const MAX_AGE_MS = 5 * 60_000

/** FR-004: needs the Geolocation API and a secure page (HTTPS or localhost). */
export function isGeolocationSupported(): boolean {
  return 'geolocation' in navigator && window.isSecureContext === true
}

const ERROR_KINDS: Record<number, LocationErrorKind> = {
  1: 'denied',
  2: 'unavailable',
  3: 'timeout',
}

function toPermissionResult(state: string): PermissionResult {
  return state === 'granted' || state === 'denied' || state === 'prompt' ? state : 'unknown'
}

/** One position fix, rounded to 2 dp. Rejects with `LocationError`. */
export function getPosition({ timeoutMs = LOCATION_TIMEOUT_MS } = {}): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      reject(new LocationError('unavailable', 'Location is not supported here.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({ lat: roundCoord(coords.latitude), lon: roundCoord(coords.longitude) }),
      (error) =>
        reject(
          new LocationError(ERROR_KINDS[error.code] ?? 'unavailable', error.message, {
            cause: error,
          }),
        ),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: MAX_AGE_MS },
    )
  })
}

/** The browser's permission state for location. Never throws: a missing API gives `unknown`. */
export async function queryPermission(): Promise<PermissionResult> {
  try {
    if (!('permissions' in navigator)) return 'unknown'
    const status = await navigator.permissions.query({ name: 'geolocation' })
    return toPermissionResult(status.state)
  } catch {
    return 'unknown'
  }
}

/** Calls `onChange` when the user changes the permission in the browser. Returns an unsubscribe. */
export function watchPermission(onChange: (permission: PermissionResult) => void): () => void {
  let active = true
  let status: PermissionStatus | undefined
  const listener = () => {
    if (active && status) onChange(toPermissionResult(status.state))
  }

  if ('permissions' in navigator) {
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((result) => {
        if (!active) return
        status = result
        status.addEventListener('change', listener)
      })
      .catch(() => {})
  }

  return () => {
    active = false
    status?.removeEventListener('change', listener)
  }
}
