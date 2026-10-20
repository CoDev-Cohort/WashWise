import { QueryClient } from '@tanstack/react-query'
import { ForecastError } from '@/features/forecast/errors'

const MINUTE = 60_000

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
        // Reuse a forecast for 30 minutes, then refetch on the next mount or window focus.
        staleTime: 30 * MINUTE,
        gcTime: 24 * 60 * MINUTE,
        refetchOnWindowFocus: true,
        retry: shouldRetry,
      },
    },
  })
}
