import { describe, expect, it } from 'vitest'
import { getWeatherIcon } from './getWeatherIcon'
import { FALLBACK_ICON, ICON_NAMES, WMO_ICONS } from './wmoIcons'

/** Every WMO code Open-Meteo documents (SC-002). */
const OPEN_METEO_CODES = [
  0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86,
  95, 96, 99,
]

const vendored = (variant: string) =>
  new Set(
    Object.keys(import.meta.glob('../../../public/meteocons/*/*.svg'))
      .filter((p) => p.includes(`/${variant}/`))
      .map((p) => p.split('/').at(-1)!.replace('.svg', '')),
  )

describe('WMO icon map', () => {
  it('covers every Open-Meteo weather code', () => {
    expect(
      Object.keys(WMO_ICONS)
        .map(Number)
        .sort((a, b) => a - b),
    ).toEqual(OPEN_METEO_CODES)
  })

  it.each(['static', 'animated'])('every mapped icon exists in public/meteocons/%s', (variant) => {
    const files = vendored(variant)
    for (const name of ICON_NAMES) expect(files, name).toContain(name)
  })
})

describe('getWeatherIcon', () => {
  it.each(OPEN_METEO_CODES)('code %i resolves to a labelled icon', (code) => {
    const icon = getWeatherIcon(code, true)
    expect(icon.label).not.toBe(FALLBACK_ICON.label)
    expect(icon.src).toMatch(/^\/meteocons\/static\/[\w-]+\.svg$/)
  })

  it('picks day and night versions from isDay', () => {
    expect(getWeatherIcon(0, true).name).toBe('clear-day')
    expect(getWeatherIcon(0, false).name).toBe('clear-night')
    expect(getWeatherIcon(95, false).name).toBe('thunderstorms-night')
  })

  it('uses the day icon when isDay is unknown', () => {
    expect(getWeatherIcon(2, null).name).toBe('partly-cloudy-day')
  })

  it('uses the fallback for unknown or missing codes', () => {
    expect(getWeatherIcon(42, true)).toMatchObject({
      name: 'not-available',
      label: 'Weather unavailable',
    })
    expect(getWeatherIcon(null, true).name).toBe('not-available')
  })

  it('serves the animated set on request', () => {
    expect(getWeatherIcon(63, true, 'animated').src).toBe('/meteocons/animated/rain.svg')
  })
})
