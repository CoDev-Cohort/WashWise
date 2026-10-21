import { useOutletContext } from 'react-router'
import type { Coordinates } from './types'

/**
 * The device position, for pages under `RequireLocation`. Use it to call `useForecast(lat, lon)`.
 * It is always defined there, so no loading or missing-location branch is needed.
 */
export function useCoordinates(): Coordinates {
  const coordinates = useOutletContext<Coordinates | undefined>()
  if (!coordinates) throw new Error('useCoordinates must be used inside RequireLocation')
  return coordinates
}
