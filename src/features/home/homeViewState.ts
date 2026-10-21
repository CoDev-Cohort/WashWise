import { forecastFromToday } from '@/features/forecast/fromToday'
import { roundCoord } from '@/features/forecast/query'
import type { Forecast } from '@/features/forecast/types'
import type { Coordinates } from '@/features/location/types'

/** The last forecast that loaded, and the position it was loaded for. */
export interface LastGood {
  data: Forecast
  coords: Coordinates
}

/** Why the forecast on screen may be out of date: the device is offline, or an update failed. */
export type StaleReason = 'offline' | 'failed'

export type HomeViewState =
  | { kind: 'loading' }
  | { kind: 'error'; error: unknown }
  | { kind: 'ready'; data: Forecast; stale: false }
  /** `previousLocation`: the forecast is for an earlier ~1 km cell than the current position. */
  | {
      kind: 'ready'
      data: Forecast
      stale: true
      reason: StaleReason
      error: unknown
      previousLocation: boolean
    }

export interface ForecastQueryState {
  data: Forecast | undefined
  error: unknown
  isFetching: boolean
}

export interface ViewContext {
  /** What the device reports (`useOnline`). `false` is reliable; `true` can still be a dead connection. */
  online: boolean
  now: number
}

const sameCell = (a: Coordinates, b: Coordinates) =>
  roundCoord(a.lat) === roundCoord(b.lat) && roundCoord(a.lon) === roundCoord(b.lon)

/**
 * What the home page shows (P4.1 FR-001, FR-006, FR-007; P4.2 FR-005, FR-016, FR-017). Once any
 * forecast has loaded, the page never goes back to a skeleton or a full-page error: being offline or a
 * failed update keeps that forecast and marks it stale. A forecast that no longer covers today counts
 * as no forecast. `lastGood` matters when the position moved: TanStack drops the placeholder when the
 * new cell fails, and after a restart offline in a new cell it is the only forecast there is.
 *
 * "Offline" comes from the device, never from TanStack's fetch status: TanStack assumes it is online at
 * startup, so an offline cold start looks like a running (then failed) fetch, not a paused one.
 */
export function getHomeViewState(
  query: ForecastQueryState,
  lastGood: LastGood | undefined,
  coords: Coordinates,
  { online, now }: ViewContext,
): HomeViewState {
  const hasError = query.error != null
  const stale = (data: Forecast, previousLocation: boolean): HomeViewState | undefined =>
    !online || hasError
      ? {
          kind: 'ready',
          data,
          stale: true,
          reason: online ? 'failed' : 'offline',
          error: query.error,
          previousLocation,
        }
      : undefined

  const current = query.data && forecastFromToday(query.data, now)
  if (current) return stale(current, false) ?? { kind: 'ready', data: current, stale: false }

  const last = lastGood && forecastFromToday(lastGood.data, now)
  if (last) {
    return (
      stale(last, !sameCell(lastGood.coords, coords)) ?? { kind: 'ready', data: last, stale: false }
    )
  }
  // Nothing to show offline: say so now instead of waiting on a request that can't succeed.
  if (!online) return { kind: 'error', error: query.error }
  // Retrying after a failed first load shows the skeleton again (P4.1 Story 2, criterion 2).
  if (hasError && !query.isFetching) return { kind: 'error', error: query.error }
  return { kind: 'loading' }
}
