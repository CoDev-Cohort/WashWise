import { useQuery } from '@tanstack/react-query'
import { fetchForecast } from './api'
import type { ForecastError } from './errors'
import { roundCoord } from './query'
import type { Forecast } from './types'

export const forecastKey = (lat: number, lon: number) =>
  ['forecast', roundCoord(lat), roundCoord(lon)] as const

/**
 * The 7-day forecast for a location. Disabled until both coordinates are known (P2 supplies them).
 * Caching follows the app QueryClient: 30 min fresh, refetch on focus, previous data kept while refetching.
 */
export function useForecast(lat?: number, lon?: number) {
  const enabled = lat !== undefined && lon !== undefined
  return useQuery<Forecast, ForecastError>({
    queryKey: enabled ? forecastKey(lat, lon) : ['forecast', 'disabled'],
    queryFn: ({ signal }) => fetchForecast(lat!, lon!, { signal }),
    enabled,
  })
}
