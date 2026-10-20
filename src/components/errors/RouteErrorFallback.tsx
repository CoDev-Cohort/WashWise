import { useEffect } from 'react'
import { useRouteError } from 'react-router'
import { ErrorFallback } from './ErrorFallback'

/** Router `errorElement`: errors thrown while rendering a route. */
export function RouteErrorFallback() {
  const error = useRouteError()
  useEffect(() => {
    console.error('[WashWise] Route error', error)
  }, [error])
  return <ErrorFallback />
}
