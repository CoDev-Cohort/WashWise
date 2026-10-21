import { roundCoord } from '@/features/forecast/query'
import type { Forecast } from '@/features/forecast/types'
import type { Coordinates } from '@/features/location/types'

/** The last forecast that loaded, and the position it was loaded for. */
export interface LastGood {
  data: Forecast
  coords: Coordinates
}

export type HomeViewState =
  | { kind: 'loading' }
  | { kind: 'error'; error: unknown }
  | { kind: 'ready'; data: Forecast; stale: false }
  /** `previousLocation`: the forecast is for an earlier ~1 km cell than the current position. */
  | { kind: 'ready'; data: Forecast; stale: true; error: unknown; previousLocation: boolean }

export interface ForecastQueryState {
  data: Forecast | undefined
  error: unknown
  isFetching: boolean
}

const sameCell = (a: Coordinates, b: Coordinates) =>
  roundCoord(a.lat) === roundCoord(b.lat) && roundCoord(a.lon) === roundCoord(b.lon)

/**
 * What the home page shows (spec FR-001, FR-006, FR-007). Once any forecast has loaded, the page never
 * goes back to a skeleton or a full-page error: a failed update keeps that forecast and marks it stale.
 * `lastGood` matters when the position moved: TanStack drops the placeholder when the new cell fails.
 */
export function getHomeViewState(
  query: ForecastQueryState,
  lastGood: LastGood | undefined,
  coords: Coordinates,
): HomeViewState {
  const hasError = query.error != null
  if (query.data) {
    return hasError
      ? {
          kind: 'ready',
          data: query.data,
          stale: true,
          error: query.error,
          previousLocation: false,
        }
      : { kind: 'ready', data: query.data, stale: false }
  }
  if (lastGood) {
    return hasError
      ? {
          kind: 'ready',
          data: lastGood.data,
          stale: true,
          error: query.error,
          previousLocation: !sameCell(lastGood.coords, coords),
        }
      : { kind: 'ready', data: lastGood.data, stale: false }
  }
  // Retrying after a failed first load shows the skeleton again (spec Story 2, criterion 2).
  if (hasError && !query.isFetching) return { kind: 'error', error: query.error }
  return { kind: 'loading' }
}
