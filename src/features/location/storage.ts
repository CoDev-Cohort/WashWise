import { roundCoord } from '@/features/forecast/query'
import type { Coordinates } from './types'

/** The `v1` lets a later change to the record shape start from a clean slate. */
export const LOCATION_STORAGE_KEY = 'washwise:location:v1'

function isCoordinates(value: unknown): value is Coordinates {
  if (typeof value !== 'object' || value === null) return false
  const { lat, lon } = value as Record<string, unknown>
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lon) <= 180
  )
}

/** The last saved position, or `undefined` if there is none or it can't be read (FR-007). */
export function loadSavedLocation(): Coordinates | undefined {
  try {
    const raw = localStorage.getItem(LOCATION_STORAGE_KEY)
    if (raw === null) return undefined
    const parsed: unknown = JSON.parse(raw)
    return isCoordinates(parsed) ? { lat: parsed.lat, lon: parsed.lon } : undefined
  } catch {
    return undefined
  }
}

/** Saves the position rounded to about 1 km. Silently does nothing if storage is unavailable. */
export function saveLocation({ lat, lon }: Coordinates): void {
  try {
    localStorage.setItem(
      LOCATION_STORAGE_KEY,
      JSON.stringify({ lat: roundCoord(lat), lon: roundCoord(lon) }),
    )
  } catch {
    // Private mode or a full quota: the app still works, it just forgets the location.
  }
}
