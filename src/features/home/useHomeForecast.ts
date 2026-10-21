import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { getLatestForecast } from '@/features/forecast/cache'
import { errorLabel, type ErrorCopy } from '@/features/forecast/errorLabel'
import { useForecast } from '@/features/forecast/useForecast'
import type { Coordinates } from '@/features/location/types'
import { useOnline } from '@/lib/useOnline'
import { getHomeViewState, type HomeViewState, type LastGood } from './homeViewState'

export interface HomeForecast {
  view: HomeViewState
  /** The error copy for the current failure, if there is one. */
  copy: ErrorCopy | undefined
  /** The position the forecast on screen belongs to (differs from the device's on `previousLocation`). */
  shownCoords: Coordinates
  isFetching: boolean
  /** Asks for the forecast again. A press while a request runs joins it instead of restarting it. */
  retry: () => void
}

/**
 * The forecast as the home page shows it: `useForecast` plus the last forecast that loaded. `now` trims
 * days that have ended. After a restart, the last forecast starts as the newest one restored from the
 * device, for any position, so a new ~1 km cell offline still has something to show (4.2 FR-016).
 */
export function useHomeForecast(coords: Coordinates, now: number): HomeForecast {
  const query = useForecast(coords.lat, coords.lon)
  const online = useOnline()
  const client = useQueryClient()
  const [lastGood, setLastGood] = useState<LastGood | undefined>(() => getLatestForecast(client))

  // Remember every real (non-placeholder) result while rendering, so it is there on the same render.
  if (query.data && !query.isPlaceholderData && query.data !== lastGood?.data) {
    setLastGood({ data: query.data, coords })
  }

  const view = getHomeViewState(query, lastGood, coords, { online, now })
  const failed = view.kind === 'error' || (view.kind === 'ready' && view.stale)
  const { refetch } = query
  const retry = useCallback(() => void refetch({ cancelRefetch: false }), [refetch])

  return {
    view,
    copy: failed ? errorLabel(query.error, { online }) : undefined,
    shownCoords:
      view.kind === 'ready' && view.stale && view.previousLocation ? lastGood!.coords : coords,
    isFetching: query.isFetching,
    retry,
  }
}
