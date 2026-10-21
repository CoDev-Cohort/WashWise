import { dehydrate, hydrate, type DehydratedState, type QueryClient } from '@tanstack/react-query'
import { FORECAST_CACHE_MAX_AGE } from '@/app/queryClient'

/** The only place `ww-forecast-cache` is read or written (task 4.2 FR-002). */
export const FORECAST_CACHE_KEY = 'ww-forecast-cache'

/**
 * Bump whenever the `Forecast` shape changes, so forecasts saved by an older build are dropped instead
 * of reaching the verdict engine. `cachePersistence.test.ts` fails when the shape changes without it.
 */
export const FORECAST_CACHE_VERSION = 1

/** How many forecasts (one per ~1 km cell) are kept on the device. */
export const PERSISTED_FORECASTS = 3

const SAVE_THROTTLE_MS = 1000

interface StoredCache {
  version: number
  state: DehydratedState
}

function storage(): Storage | undefined {
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

function remove() {
  try {
    storage()?.removeItem(FORECAST_CACHE_KEY)
  } catch {
    // Storage is blocked; nothing to clean up.
  }
}

/** Hashes of the newest successful forecast queries, at most `PERSISTED_FORECASTS`. */
export function forecastsToPersist(client: QueryClient): Set<string> {
  const queries = client
    .getQueryCache()
    .findAll({ queryKey: ['forecast'] })
    .filter((q) => q.state.status === 'success' && typeof q.queryKey[1] === 'number')
    .sort((a, b) => b.state.dataUpdatedAt - a.state.dataUpdatedAt)
    .slice(0, PERSISTED_FORECASTS)
  return new Set(queries.map((q) => q.queryHash))
}

/** Writes the newest forecasts to the device. Never throws: a full or blocked storage just skips it. */
export function saveForecastCache(client: QueryClient) {
  const keep = forecastsToPersist(client)
  const state = dehydrate(client, {
    shouldDehydrateQuery: (query) => keep.has(query.queryHash),
    shouldDehydrateMutation: () => false,
  })
  const stored: StoredCache = { version: FORECAST_CACHE_VERSION, state }
  try {
    storage()?.setItem(FORECAST_CACHE_KEY, JSON.stringify(stored))
  } catch {
    // Quota or blocked storage: the app keeps working without an offline copy.
  }
}

function isStoredCache(value: unknown): value is StoredCache {
  if (typeof value !== 'object' || value === null) return false
  const { version, state } = value as Partial<StoredCache>
  return version === FORECAST_CACHE_VERSION && Array.isArray(state?.queries)
}

/**
 * Puts the saved forecasts back in the cache, synchronously, before the first render, so a returning
 * user sees the last forecast at once (stale-while-revalidate: TanStack refetches it in the background
 * once it is older than `staleTime`). Drops forecasts older than `FORECAST_CACHE_MAX_AGE` and anything
 * saved by another `FORECAST_CACHE_VERSION`.
 */
export function restoreForecastCache(client: QueryClient, now = Date.now()) {
  let raw: string | null | undefined
  try {
    raw = storage()?.getItem(FORECAST_CACHE_KEY)
  } catch {
    return
  }
  if (!raw) return
  try {
    const stored: unknown = JSON.parse(raw)
    if (!isStoredCache(stored)) return remove()
    const queries = stored.state.queries.filter(
      (q) => now - q.state.dataUpdatedAt < FORECAST_CACHE_MAX_AGE,
    )
    hydrate(client, { mutations: [], queries })
  } catch {
    remove()
  }
}

/**
 * Saves the forecasts whenever one loads (at most once a second), and right away when the page is
 * hidden, so closing the app just after a refresh still keeps it. Returns a function that stops it.
 */
export function persistForecastCache(client: QueryClient): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  const flush = () => {
    clearTimeout(timer)
    timer = undefined
    saveForecastCache(client)
  }
  const unsubscribe = client.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated' || event.action.type !== 'success') return
    if (event.query.queryKey[0] !== 'forecast' || timer) return
    timer = setTimeout(flush, SAVE_THROTTLE_MS)
  })
  const onHide = () => {
    if (timer && document.visibilityState === 'hidden') flush()
  }
  document.addEventListener('visibilitychange', onHide)
  return () => {
    clearTimeout(timer)
    unsubscribe()
    document.removeEventListener('visibilitychange', onHide)
  }
}
