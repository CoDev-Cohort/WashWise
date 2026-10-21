import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef, useState } from 'react'
import { useOutletContext } from 'react-router'
import { forecastKey } from '@/features/forecast/useForecast'
import type { Coordinates, LocationOutletContext } from './types'

function useLocationContext(hook: string): LocationOutletContext {
  const context = useOutletContext<LocationOutletContext | undefined>()
  if (!context) throw new Error(`${hook} must be used inside RequireLocation`)
  return context
}

/**
 * The device position, for pages under `RequireLocation`. Use it to call `useForecast(lat, lon)`.
 * It is always defined there, so no loading or missing-location branch is needed.
 */
export function useCoordinates(): Coordinates {
  return useLocationContext('useCoordinates').coordinates
}

/**
 * Re-asks the device for the position (the location pill) and refetches the forecast for it.
 * Only one refresh runs at a time. A failed request resolves with `undefined` and changes nothing,
 * so the page keeps the previous position and forecast.
 */
export function useLocationRefresh() {
  const { request } = useLocationContext('useLocationRefresh')
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)
  const inFlight = useRef(false)

  const refresh = useCallback(async () => {
    if (inFlight.current) return undefined
    inFlight.current = true
    setRefreshing(true)
    try {
      const position = await request()
      // Same ~1 km cell → same query key, so ask for fresh data explicitly. A new cell fetches by itself.
      if (position) {
        await queryClient.invalidateQueries({ queryKey: forecastKey(position.lat, position.lon) })
      }
      return position
    } finally {
      inFlight.current = false
      setRefreshing(false)
    }
  }, [request, queryClient])

  return { refresh, refreshing }
}
