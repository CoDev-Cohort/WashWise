import { QueryClient } from '@tanstack/react-query'
import { ForecastError } from '@/features/forecast/errors'

const MINUTE = 60_000

/**
 * How long a forecast is kept, in memory and on the device (task 4.2). A forecast covers 7 days, so an
 * older one has nothing left to show. `gcTime` must be at least this, or restored queries are dropped.
 */
export const FORECAST_CACHE_MAX_AGE = 7 * 24 * 60 * MINUTE

/**
 * Retry once, and only for failures that may pass on a second try: network errors and 5xx.
 * A timeout already waited 10 s (FR-008a); invalid bodies and 4xx won't change on retry.
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) return false
  if (!(error instanceof ForecastError)) return true
  if (error.kind === 'network') return true
  return error.kind === 'http' && (error.status ?? 0) >= 500
}

/** App-wide query defaults (FR-008). */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Reuse a forecast for 30 minutes, then refetch on the next mount or window focus. A forecast
        // restored from the device shows at once and refetches in the background the same way.
        staleTime: 30 * MINUTE,
        gcTime: FORECAST_CACHE_MAX_AGE,
        refetchOnWindowFocus: true,
        // TanStack's default, relied on offline: refetch when the connection comes back (4.2 FR-007).
        refetchOnReconnect: true,
        retry: shouldRetry,
      },
    },
  })
}
