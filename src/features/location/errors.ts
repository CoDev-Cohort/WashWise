import type { LocationErrorKind } from './types'

/** Why the device could not give us a position. */
export class LocationError extends Error {
  readonly kind: LocationErrorKind

  constructor(kind: LocationErrorKind, message: string, options?: { cause?: unknown }) {
    super(message, { cause: options?.cause })
    this.name = 'LocationError'
    this.kind = kind
  }
}
