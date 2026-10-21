import { useQuery } from '@tanstack/react-query'
import { roundCoord } from '@/features/forecast/query'
import { FALLBACK_PLACE_NAME, fetchCityName, GeocodeError } from './geocode'

export const cityNameKey = (lat: number, lon: number) =>
  ['cityName', roundCoord(lat), roundCoord(lon)] as const

/** Retry once, only when a second try could help: a dropped connection or a 5xx. Never a 429 or a timeout. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1 || !(error instanceof GeocodeError)) return false
  return error.kind === 'network' || (error.kind === 'http' && (error.status ?? 0) >= 500)
}

/**
 * A place name for the location pill (FR-015, FR-016). Always returns something to show: "Your location"
 * while loading, when there are no coordinates yet, and when the lookup fails. It never blocks or breaks
 * the page. A name is kept for the rest of the visit and shared by every position in the same ~1 km cell.
 */
export function useCityName(lat?: number, lon?: number): string {
  const enabled = lat !== undefined && lon !== undefined
  const { data } = useQuery<string, GeocodeError>({
    queryKey: enabled ? cityNameKey(lat, lon) : ['cityName', 'disabled'],
    queryFn: ({ signal }) => fetchCityName(lat!, lon!, { signal }),
    enabled,
    // A place doesn't change its name, so never refetch a name we already have.
    staleTime: Infinity,
    retry: shouldRetry,
  })
  return data ?? FALLBACK_PLACE_NAME
}
