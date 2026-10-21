import { roundCoord } from '@/features/forecast/query'
import { TimeoutError, withTimeout } from '@/lib/withTimeout'

/** BigDataCloud's keyless, client-side reverse geocoder. */
export const GEOCODE_ENDPOINT = 'https://api.bigdatacloud.net/data/reverse-geocode-client'

/** Shown when no place name is available (FR-015). */
export const FALLBACK_PLACE_NAME = 'Your location'

/** Like the forecast, a lookup with no answer after 10 s counts as a failure. */
export const GEOCODE_TIMEOUT_MS = 10_000

export type GeocodeErrorKind = 'network' | 'timeout' | 'http' | 'invalid'

/** Every way the place-name lookup can fail. The UI never shows it: it falls back to a fixed name. */
export class GeocodeError extends Error {
  readonly kind: GeocodeErrorKind
  readonly status?: number

  constructor(
    kind: GeocodeErrorKind,
    message: string,
    options?: { status?: number; cause?: unknown },
  ) {
    super(message, { cause: options?.cause })
    this.name = 'GeocodeError'
    this.kind = kind
    this.status = options?.status
  }
}

export function buildGeocodeUrl(lat: number, lon: number): string {
  const params = new URLSearchParams({
    latitude: roundCoord(lat).toString(),
    longitude: roundCoord(lon).toString(),
    localityLanguage: 'en',
  })
  return `${GEOCODE_ENDPOINT}?${params}`
}

const NAME_FIELDS = ['city', 'locality', 'principalSubdivision'] as const

/**
 * The first non-blank of city, locality, region. A response with none of them (open sea, say) gets
 * the fallback. Anything that isn't an object is an `invalid` response.
 */
export function pickPlaceName(body: unknown): string {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new GeocodeError('invalid', 'The place-name response was not an object.')
  }
  const fields = body as Record<string, unknown>
  for (const field of NAME_FIELDS) {
    const value = fields[field]
    if (typeof value === 'string' && value.trim() !== '') return value.trim()
  }
  return FALLBACK_PLACE_NAME
}

export interface FetchCityNameOptions {
  signal?: AbortSignal
  timeoutMs?: number
}

/** Looks up a place name for a position. Throws `GeocodeError`. No API key is needed. */
export async function fetchCityName(
  lat: number,
  lon: number,
  { signal, timeoutMs = GEOCODE_TIMEOUT_MS }: FetchCityNameOptions = {},
): Promise<string> {
  const timeout = withTimeout(signal, timeoutMs)
  try {
    let response: Response
    try {
      response = await fetch(buildGeocodeUrl(lat, lon), { signal: timeout.signal })
    } catch (err) {
      throw classify(err, timeout.signal, signal)
    }
    if (!response.ok) {
      throw new GeocodeError('http', `Place-name service error (${response.status}).`, {
        status: response.status,
      })
    }
    // The timeout keeps running while the body streams in, so a body-read failure may be an abort.
    const body: unknown = await response.json().catch((err: unknown) => {
      if (err instanceof SyntaxError && !timeout.signal.aborted) {
        throw new GeocodeError('invalid', 'The place-name response was not valid JSON.', {
          cause: err,
        })
      }
      throw classify(err, timeout.signal, signal)
    })
    return pickPlaceName(body)
  } finally {
    timeout.clear()
  }
}

/** Turns a failed request into a `GeocodeError`. A cancellation by the caller is passed through. */
function classify(err: unknown, timeoutSignal: AbortSignal, callerSignal?: AbortSignal): unknown {
  if (timeoutSignal.reason instanceof TimeoutError) {
    return new GeocodeError('timeout', 'The place-name lookup took too long.', { cause: err })
  }
  if (callerSignal?.aborted) return err
  return new GeocodeError('network', 'Could not reach the place-name service.', { cause: err })
}
