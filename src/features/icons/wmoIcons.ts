/**
 * WMO weather code → Meteocons icon (FR-015). Pure data, no React (FR-006).
 * Codes: https://open-meteo.com/en/docs (WMO Weather interpretation codes).
 */
export interface WeatherIconSpec {
  /** Meteocons file name (without .svg) for day and night. */
  day: string
  night: string
  /** Accessible label. */
  label: string
}

const same = (name: string, label: string): WeatherIconSpec => ({ day: name, night: name, label })
const dn = (base: string, label: string, suffix = ''): WeatherIconSpec => ({
  day: `${base}-day${suffix}`,
  night: `${base}-night${suffix}`,
  label,
})

export const WMO_ICONS: Record<number, WeatherIconSpec> = {
  0: dn('clear', 'Clear sky'),
  1: dn('partly-cloudy', 'Mainly clear'),
  2: dn('partly-cloudy', 'Partly cloudy'),
  3: dn('overcast', 'Overcast'),
  45: dn('fog', 'Fog'),
  48: dn('fog', 'Freezing fog'),
  51: dn('partly-cloudy', 'Light drizzle', '-drizzle'),
  53: same('drizzle', 'Drizzle'),
  55: same('drizzle', 'Heavy drizzle'),
  56: same('sleet', 'Light freezing drizzle'),
  57: same('sleet', 'Freezing drizzle'),
  61: dn('partly-cloudy', 'Light rain', '-rain'),
  63: same('rain', 'Rain'),
  65: same('rain', 'Heavy rain'),
  66: same('sleet', 'Light freezing rain'),
  67: same('sleet', 'Freezing rain'),
  71: dn('partly-cloudy', 'Light snow', '-snow'),
  73: same('snow', 'Snow'),
  75: same('snow', 'Heavy snow'),
  77: same('snow', 'Snow grains'),
  80: dn('partly-cloudy', 'Light showers', '-rain'),
  81: dn('partly-cloudy', 'Showers', '-rain'),
  82: same('rain', 'Heavy showers'),
  85: dn('partly-cloudy', 'Snow showers', '-snow'),
  86: dn('partly-cloudy', 'Heavy snow showers', '-snow'),
  95: dn('thunderstorms', 'Thunderstorm'),
  96: dn('thunderstorms', 'Thunderstorm with hail', '-rain'),
  99: dn('thunderstorms', 'Thunderstorm with heavy hail', '-rain'),
}

export const FALLBACK_ICON: WeatherIconSpec = same('not-available', 'Weather unavailable')

/** Every Meteocons file the app needs (used by scripts/vendor-meteocons.ts and tests). */
export const ICON_NAMES: string[] = [
  ...new Set([...Object.values(WMO_ICONS), FALLBACK_ICON].flatMap((s) => [s.day, s.night])),
].sort()
