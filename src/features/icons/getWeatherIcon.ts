import { FALLBACK_ICON, WMO_ICONS } from './wmoIcons'

export type IconVariant = 'static' | 'animated'

export const METEOCONS_BASE = '/meteocons'

/**
 * Icon for a WMO code. Night version when `isDay` is false; day when true or unknown.
 * Unknown or missing codes get the fallback icon (FR-015).
 */
export function getWeatherIcon(
  code: number | null,
  isDay: boolean | null,
  variant: IconVariant = 'static',
): { src: string; label: string; name: string } {
  const spec = (code !== null && WMO_ICONS[code]) || FALLBACK_ICON
  const name = isDay === false ? spec.night : spec.day
  return { src: `${METEOCONS_BASE}/${variant}/${name}.svg`, label: spec.label, name }
}
