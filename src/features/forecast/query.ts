/** The Open-Meteo query WashWise uses. Shared by the app and `scripts/record-fixtures.ts`. */
export const FORECAST_ENDPOINT = 'https://api.open-meteo.com/v1/forecast'

export const HOURLY_FIELDS = [
  'precipitation_probability',
  'precipitation',
  'temperature_2m',
  'relative_humidity_2m',
  'wind_speed_10m',
  'cloud_cover',
  'weather_code',
  'is_day',
] as const

export const DAILY_FIELDS = [
  'weather_code',
  'sunrise',
  'sunset',
  'daylight_duration',
  'precipitation_probability_max',
  'precipitation_sum',
  'temperature_2m_max',
  'temperature_2m_min',
] as const

/** Rounds to 2 dp (≈1 km). Keeps the cache key stable as the device location jitters. */
export const roundCoord = (value: number) => Math.round(value * 100) / 100

export function buildForecastUrl(lat: number, lon: number): string {
  const params = new URLSearchParams({
    latitude: roundCoord(lat).toString(),
    longitude: roundCoord(lon).toString(),
    hourly: HOURLY_FIELDS.join(','),
    daily: DAILY_FIELDS.join(','),
    timezone: 'auto',
    timeformat: 'unixtime',
    forecast_days: '7',
    wind_speed_unit: 'kmh',
  })
  return `${FORECAST_ENDPOINT}?${params}`
}
