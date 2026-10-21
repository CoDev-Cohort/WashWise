/** A position in degrees, rounded to 2 dp (about 1 km). */
export interface Coordinates {
  lat: number
  lon: number
}

/**
 * Where a location request stands. `blocked` is the spec's "permanently blocked": the browser
 * will not show the prompt again until the user changes the site settings.
 */
export type LocationStatus =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'blocked'
  | 'unavailable'
  | 'timeout'
  | 'unsupported'

/** What the Permissions API can tell us. `unknown` = the API is missing or failed. */
export type PermissionResult = 'granted' | 'denied' | 'prompt' | 'unknown'

export type LocationErrorKind = 'denied' | 'unavailable' | 'timeout'
