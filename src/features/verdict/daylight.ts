import type { DailyPoint, EpochMs, Forecast, HourlyPoint } from '@/features/forecast/types'
import { VERDICT_CONFIG, type VerdictConfig } from './config'

export const HOUR = 3_600_000
const DAY = 24 * HOUR

export interface Interval {
  start: EpochMs
  end: EpochMs
}

/** End of day `index`: the next day's start, so 23 h / 25 h DST days bucket correctly. */
export function dayEnd(forecast: Forecast, index: number): EpochMs {
  return forecast.daily[index + 1]?.start ?? forecast.daily[index]!.start + DAY
}

/** Index of the day containing `time`, or -1 when outside the forecast. */
export function dayIndexForTime(forecast: Forecast, time: EpochMs): number {
  return forecast.daily.findIndex((d, i) => time >= d.start && time < dayEnd(forecast, i))
}

export function isPolarDay(day: DailyPoint, cfg: VerdictConfig = VERDICT_CONFIG): boolean {
  return day.daylightDuration >= cfg.polar.polarDayMinSeconds
}

/**
 * Usable daylight for laundry (FR-004d): sunrise to 1 h before sunset; the whole day on a polar day.
 * `null` when sunrise/sunset is missing, or when there's no usable time (e.g. polar night, where
 * Open-Meteo reports sunrise == sunset, or under an hour of daylight). `daylightDuration` only
 * detects polar day.
 */
export function getUsableDaylight(
  forecast: Forecast,
  index: number,
  cfg: VerdictConfig = VERDICT_CONFIG,
): Interval | null {
  const day = forecast.daily[index]!
  if (isPolarDay(day, cfg)) return { start: day.start, end: dayEnd(forecast, index) }
  if (day.sunrise == null || day.sunset == null) return null
  const end = day.sunset - cfg.laundry.usableDaylightEndsBeforeSunsetHours * HOUR
  return end > day.sunrise ? { start: day.sunrise, end } : null
}

/** "Dark" for drying (FR-004d): sunset, or the end of the day on a polar day. */
export function darkness(
  forecast: Forecast,
  index: number,
  cfg: VerdictConfig = VERDICT_CONFIG,
): EpochMs {
  const day = forecast.daily[index]!
  return isPolarDay(day, cfg) || day.sunset == null ? dayEnd(forecast, index) : day.sunset
}

/** Hours whose start lies in [start, end). */
export function hoursInRange(hours: HourlyPoint[], start: EpochMs, end: EpochMs): HourlyPoint[] {
  return hours.filter((h) => h.time >= start && h.time < end)
}

/** Start of the forecast hour containing `time` (works for half-hour UTC offsets too). */
export function hourStartAt(hours: HourlyPoint[], time: EpochMs): EpochMs {
  let found = time
  for (const h of hours) {
    if (h.time > time) break
    found = h.time
  }
  return found
}
