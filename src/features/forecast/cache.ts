import type { QueryClient } from '@tanstack/react-query'
import type { Forecast } from './types'

/** A forecast in the query cache and the (rounded) position it was loaded for. */
export interface CachedForecast {
  data: Forecast
  coords: { lat: number; lon: number }
}

/**
 * The most recently loaded forecast in the cache, for any position (task 4.2 FR-016). After a restart
 * offline in a new ~1 km cell, the home page shows this instead of nothing.
 */
export function getLatestForecast(client: QueryClient): CachedForecast | undefined {
  let latest: { cached: CachedForecast; at: number } | undefined
  for (const query of client.getQueryCache().findAll({ queryKey: ['forecast'] })) {
    const [, lat, lon] = query.queryKey
    const data = query.state.data as Forecast | undefined
    if (!data || typeof lat !== 'number' || typeof lon !== 'number') continue
    if (latest && query.state.dataUpdatedAt <= latest.at) continue
    latest = { cached: { data, coords: { lat, lon } }, at: query.state.dataUpdatedAt }
  }
  return latest?.cached
}
