import { useMemo } from 'react'
import { Navigate, Outlet } from 'react-router'
import type { LocationOutletContext } from './types'
import { useGeolocation } from './useGeolocation'

/**
 * Layout for pages that need the device location (`/home`).
 * The route loader has already checked permission before the first render (FR-012). This covers what
 * happens afterwards: it refreshes the position quietly, and sends the user back to the landing page
 * if permission is revoked or refused while the app is open (FR-014).
 * A failed refresh (unavailable, timeout) keeps the saved position and never kicks the user out.
 * Pages read the position with `useCoordinates()` and re-request it with `useLocationRefresh()`.
 */
export function RequireLocation() {
  const { status, coordinates, request } = useGeolocation({ refreshOnMount: true })
  const context = useMemo(
    () => (coordinates ? ({ coordinates, request, status } satisfies LocationOutletContext) : null),
    [coordinates, request, status],
  )

  if (!context || status === 'denied' || status === 'blocked' || status === 'unsupported') {
    return <Navigate to="/" replace />
  }
  return <Outlet context={context} />
}
