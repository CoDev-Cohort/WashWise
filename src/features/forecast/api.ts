import { TimeoutError, withTimeout } from '@/lib/withTimeout'
import { ForecastError } from './errors'
import { normalizeForecast } from './normalize'
import { buildForecastUrl } from './query'
import type { Forecast } from './types'

/** FR-008a: no response after 10 s counts as a failure. */
export const FORECAST_TIMEOUT_MS = 10_000

export interface FetchForecastOptions {
  signal?: AbortSignal
  timeoutMs?: number
}

/** Fetches and normalizes the 7-day forecast. No API key is needed (FR-007). Throws `ForecastError`. */
export async function fetchForecast(
  lat: number,
  lon: number,
  { signal, timeoutMs = FORECAST_TIMEOUT_MS }: FetchForecastOptions = {},
): Promise<Forecast> {
  const timeout = withTimeout(signal, timeoutMs)
  let response: Response
  try {
    response = await fetch(buildForecastUrl(lat, lon), { signal: timeout.signal })
  } catch (err) {
    timeout.clear()
    if (timeout.signal.reason instanceof TimeoutError) {
      throw new ForecastError('timeout', 'The forecast took too long to load.', { cause: err })
    }
    if (signal?.aborted) throw err // cancelled by the caller (e.g. TanStack Query); not a failure
    throw new ForecastError('network', 'Could not reach the forecast service.', { cause: err })
  }

  try {
    if (!response.ok) {
      const reason = await response
        .json()
        .then((b: { reason?: string }) => b.reason)
        .catch(() => undefined)
      throw new ForecastError('http', reason ?? `Forecast service error (${response.status}).`, {
        status: response.status,
      })
    }
    const body: unknown = await response.json().catch((err: unknown) => {
      throw new ForecastError('invalid', 'The forecast response was not valid JSON.', {
        cause: err,
      })
    })
    return normalizeForecast(body)
  } finally {
    timeout.clear()
  }
}
