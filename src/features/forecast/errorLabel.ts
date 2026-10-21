import { ForecastError } from './errors'

/** What an error state says: one label naming the cause, and a hint on what to do (FR-005). */
export interface ErrorCopy {
  label: string
  hint: string
}

export const OFFLINE: ErrorCopy = {
  label: 'You’re offline',
  hint: 'Check your connection and try again. Your location is still saved.',
}
export const TOO_SLOW: ErrorCopy = {
  label: 'The forecast is taking too long',
  hint: 'The weather service didn’t answer in time. Try again in a moment.',
}
export const SERVICE: ErrorCopy = {
  label: 'The forecast service is having trouble',
  hint: 'This is on their side, not yours. Try again in a moment.',
}
export const GENERIC: ErrorCopy = {
  label: 'We couldn’t load the forecast',
  hint: 'Something went wrong getting the forecast. Try again.',
}

/**
 * Error copy by cause. The device reporting itself offline wins over the error kind, because a
 * dropped connection can surface as any of them. The only place error wording lives.
 */
export function errorLabel(error: unknown, { online }: { online: boolean }): ErrorCopy {
  if (!online) return OFFLINE
  if (!(error instanceof ForecastError)) return GENERIC
  if (error.kind === 'network') return OFFLINE
  if (error.kind === 'timeout') return TOO_SLOW
  if (error.kind === 'http' && (error.status ?? 0) >= 500) return SERVICE
  return GENERIC
}
