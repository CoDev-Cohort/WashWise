import { QueryClient } from '@tanstack/react-query'

const MINUTE = 60_000

/** App-wide query defaults (FR-008). */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Reuse a forecast for 30 minutes, then refetch on the next mount or window focus.
        staleTime: 30 * MINUTE,
        gcTime: 24 * 60 * MINUTE,
        refetchOnWindowFocus: true,
        retry: 1,
      },
    },
  })
}
