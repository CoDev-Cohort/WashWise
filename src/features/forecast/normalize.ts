import { ForecastError } from './errors'
import type { DailyPoint, EpochMs, Forecast, HourlyPoint, OpenMeteoResponse } from './types'

const SECOND = 1000

const toMs = (seconds: number | null | undefined): EpochMs | null =>
  seconds == null ? null : seconds * SECOND

/** 'YYYY-MM-DD' for an instant, in a fixed UTC offset (Open-Meteo uses one offset per response). */
export function localDate(time: EpochMs, utcOffsetSeconds: number): string {
  return new Date(time + utcOffsetSeconds * SECOND).toISOString().slice(0, 10)
}

function isNumberArray(value: unknown): value is (number | null)[] {
  return Array.isArray(value) && value.every((v) => v === null || typeof v === 'number')
}

function invalid(why: string): ForecastError {
  return new ForecastError('invalid', `Unexpected forecast response: ${why}`)
}

function assertShape(raw: unknown): asserts raw is OpenMeteoResponse {
  if (!raw || typeof raw !== 'object') throw invalid('not an object')
  const r = raw as Record<string, unknown>
  if (typeof r.utc_offset_seconds !== 'number') throw invalid('missing utc_offset_seconds')
  if (typeof r.timezone !== 'string') throw invalid('missing timezone')
  for (const section of ['hourly', 'daily']) {
    const block = r[section]
    if (!block || typeof block !== 'object') throw invalid(`missing ${section}`)
    const { time } = block as Record<string, unknown>
    if (!isNumberArray(time) || time.length === 0) throw invalid(`${section}.time is empty`)
    for (const [key, values] of Object.entries(block)) {
      if (!isNumberArray(values)) throw invalid(`${section}.${key} is not a number array`)
      if (values.length !== time.length) throw invalid(`${section}.${key} length mismatch`)
    }
  }
}

/** Raw Open-Meteo response → `Forecast` (epoch ms, one object per hour/day). Throws `ForecastError('invalid')`. */
export function normalizeForecast(raw: unknown, fetchedAt: EpochMs = Date.now()): Forecast {
  assertShape(raw)
  const { hourly: h, daily: d, utc_offset_seconds: offset } = raw

  const hourly: HourlyPoint[] = h.time.map((t, i) => ({
    time: t * SECOND,
    precipProbability: h.precipitation_probability?.[i] ?? null,
    precipitation: h.precipitation?.[i] ?? null,
    temperature: h.temperature_2m?.[i] ?? null,
    relativeHumidity: h.relative_humidity_2m?.[i] ?? null,
    windSpeed: h.wind_speed_10m?.[i] ?? null,
    cloudCover: h.cloud_cover?.[i] ?? null,
    weatherCode: h.weather_code?.[i] ?? null,
    isDay: h.is_day?.[i] == null ? null : h.is_day[i] === 1,
  }))

  const daily: DailyPoint[] = d.time.map((t, i) => ({
    date: localDate(t * SECOND, offset),
    start: t * SECOND,
    sunrise: toMs(d.sunrise?.[i]),
    sunset: toMs(d.sunset?.[i]),
    daylightDuration: d.daylight_duration?.[i] ?? 0,
    weatherCode: d.weather_code?.[i] ?? null,
    precipProbabilityMax: d.precipitation_probability_max?.[i] ?? null,
    precipitationSum: d.precipitation_sum?.[i] ?? null,
    temperatureMax: d.temperature_2m_max?.[i] ?? null,
    temperatureMin: d.temperature_2m_min?.[i] ?? null,
  }))

  for (let i = 1; i < daily.length; i++) {
    if (daily[i]!.start <= daily[i - 1]!.start) {
      throw invalid('days out of order')
    }
  }

  return {
    latitude: raw.latitude,
    longitude: raw.longitude,
    timezone: raw.timezone,
    utcOffsetSeconds: offset,
    fetchedAt,
    hourly,
    daily,
  }
}
