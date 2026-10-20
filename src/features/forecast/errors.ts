export type ForecastErrorKind = 'network' | 'timeout' | 'http' | 'invalid'

/** Every forecast failure the UI may need to show. */
export class ForecastError extends Error {
  readonly kind: ForecastErrorKind
  readonly status?: number

  constructor(
    kind: ForecastErrorKind,
    message: string,
    options?: { status?: number; cause?: unknown },
  ) {
    super(message, { cause: options?.cause })
    this.name = 'ForecastError'
    this.kind = kind
    this.status = options?.status
  }
}
