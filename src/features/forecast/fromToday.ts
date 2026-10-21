import type { Forecast } from './types'

const DAY_MS = 24 * 60 * 60 * 1000

const trimmed = new WeakMap<Forecast, { first: number; result: Forecast }>()

/**
 * The forecast from the location's today on (task 4.2 FR-004, FR-017). A forecast restored from the
 * device can be days old: days that have ended, and the hours before today's local midnight, are
 * dropped so "Today" is the real today. `undefined` when no day covers `now`. Returns the same object
 * for the same input, so memoised consumers don't recompute.
 */
export function forecastFromToday(forecast: Forecast, now: number): Forecast | undefined {
  const first = forecast.daily.findIndex((day) => day.start + DAY_MS > now)
  if (first === -1) return undefined
  if (first === 0) return forecast

  const cached = trimmed.get(forecast)
  if (cached?.first === first) return cached.result
  const todayStart = forecast.daily[first]!.start
  const result: Forecast = {
    ...forecast,
    daily: forecast.daily.slice(first),
    hourly: forecast.hourly.filter((hour) => hour.time >= todayStart),
  }
  trimmed.set(forecast, { first, result })
  return result
}
