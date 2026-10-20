import type { DailyPoint, Forecast, HourlyPoint } from '@/features/forecast/types'

export const HOUR = 3_600_000
/** Day 0 local midnight. UTC offset 0 keeps test times readable. */
export const T0 = Date.UTC(2026, 9, 21)

export type HourValues = Omit<HourlyPoint, 'time'>

export const SUNNY: HourValues = {
  precipProbability: 0,
  precipitation: 0,
  temperature: 25,
  relativeHumidity: 50,
  windSpeed: 15,
  cloudCover: 0,
  weatherCode: 0,
  isDay: true,
}

export interface DayOptions {
  /** Hours after local midnight. `null` = the sun doesn't rise. */
  sunrise?: number | null
  sunset?: number | null
  /** Overrides the daylight duration (s); defaults to sunset − sunrise. */
  daylightDuration?: number
  /** Day length in hours (23/25 for DST days). */
  length?: number
}

export interface ForecastOptions {
  days?: number
  hour?: Partial<HourValues>
  /** Per-hour overrides by absolute hour index from T0. */
  hours?: (index: number, time: number) => Partial<HourValues> | undefined
  day?: (index: number) => DayOptions | undefined
}

/** A synthetic forecast: by default sunny, sunrise 06:00, sunset 18:00, 3 days. */
export function makeForecast(opts: ForecastOptions = {}): Forecast {
  const days = opts.days ?? 3
  const daily: DailyPoint[] = []
  let start = T0
  for (let i = 0; i < days; i++) {
    const d = { sunrise: 6, sunset: 18, length: 24, ...opts.day?.(i) }
    const sunrise = d.sunrise == null ? null : start + d.sunrise * HOUR
    const sunset = d.sunset == null ? null : start + d.sunset * HOUR
    daily.push({
      date: new Date(start).toISOString().slice(0, 10),
      start,
      sunrise,
      sunset,
      daylightDuration:
        d.daylightDuration ?? (sunrise != null && sunset != null ? (sunset - sunrise) / 1000 : 0),
      weatherCode: 0,
      precipProbabilityMax: 0,
      precipitationSum: 0,
      temperatureMax: 25,
      temperatureMin: 15,
    })
    start += d.length * HOUR
  }
  const hourly: HourlyPoint[] = []
  for (let t = T0, i = 0; t < start; t += HOUR, i++) {
    hourly.push({ time: t, ...SUNNY, ...opts.hour, ...opts.hours?.(i, t) })
  }
  return {
    latitude: 0,
    longitude: 0,
    timezone: 'UTC',
    utcOffsetSeconds: 0,
    fetchedAt: T0,
    hourly,
    daily,
  }
}

/** Absolute time for day `day`, local hour `h` (fractional allowed), in a 24 h-day forecast. */
export const at = (day: number, h: number) => T0 + day * 24 * HOUR + h * HOUR
