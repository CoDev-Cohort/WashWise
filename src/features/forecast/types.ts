/** Milliseconds since the Unix epoch. All forecast times are absolute, so the browser time zone never matters. */
export type EpochMs = number

/** One hour of forecast. `time` is the start of the hour. Any value can be missing. */
export interface HourlyPoint {
  time: EpochMs
  /** % */
  precipProbability: number | null
  /** mm */
  precipitation: number | null
  /** °C */
  temperature: number | null
  /** % */
  relativeHumidity: number | null
  /** km/h */
  windSpeed: number | null
  /** % */
  cloudCover: number | null
  /** WMO weather code */
  weatherCode: number | null
  isDay: boolean | null
}

export interface DailyPoint {
  /** 'YYYY-MM-DD' in the location's time zone */
  date: string
  /** Local midnight */
  start: EpochMs
  sunrise: EpochMs | null
  sunset: EpochMs | null
  /** Seconds. 0 = polar night; ≥ 86 340 = polar day. */
  daylightDuration: number
  weatherCode: number | null
  precipProbabilityMax: number | null
  precipitationSum: number | null
  temperatureMax: number | null
  temperatureMin: number | null
}

export interface Forecast {
  latitude: number
  longitude: number
  timezone: string
  utcOffsetSeconds: number
  fetchedAt: EpochMs
  hourly: HourlyPoint[]
  daily: DailyPoint[]
}

/** Raw Open-Meteo response for the query built by `buildForecastUrl` (`timeformat=unixtime`). */
export interface OpenMeteoResponse {
  latitude: number
  longitude: number
  timezone: string
  utc_offset_seconds: number
  hourly: {
    time: number[]
    precipitation_probability: (number | null)[]
    precipitation: (number | null)[]
    temperature_2m: (number | null)[]
    relative_humidity_2m: (number | null)[]
    wind_speed_10m: (number | null)[]
    cloud_cover: (number | null)[]
    weather_code: (number | null)[]
    is_day: (number | null)[]
  }
  daily: {
    time: number[]
    weather_code: (number | null)[]
    sunrise: (number | null)[]
    sunset: (number | null)[]
    daylight_duration: (number | null)[]
    precipitation_probability_max: (number | null)[]
    precipitation_sum: (number | null)[]
    temperature_2m_max: (number | null)[]
    temperature_2m_min: (number | null)[]
  }
}
