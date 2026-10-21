import { describe, expect, it } from 'vitest'
import { computeDayVerdicts } from '@/features/verdict'
import { at, makeForecast } from '@/features/verdict/__fixtures__/builders'
import { formatDryingHours, getCardContent } from './cardContent'

describe('formatDryingHours', () => {
  it.each([
    [0.1, 'Dries in ~0.5 hrs'],
    [1, 'Dries in ~1 hr'],
    [1.2, 'Dries in ~1 hr'],
    [1.3, 'Dries in ~1.5 hrs'],
    [2.5, 'Dries in ~2.5 hrs'],
    [2.74, 'Dries in ~2.5 hrs'],
    [2.76, 'Dries in ~3 hrs'],
    [4, 'Dries in ~4 hrs'],
  ])('%f h → %s', (hours, text) => {
    expect(formatDryingHours(hours)).toBe(text)
  })
})

describe('getCardContent: Today', () => {
  const now = at(0, 8)

  it('Go Wash: verdict from the engine, a drying pill and the current condition', () => {
    const { laundry, carWash } = getCardContent(makeForecast({ days: 7 }), 0, now)
    expect(laundry.result).toMatchObject({ status: 'ok', verdict: 'go', subLabel: 'Good to go' })
    expect(laundry.pills.map((p) => p.kind)).toEqual(['drying', 'condition'])
    expect(laundry.pills[0]!.text).toMatch(/^Dries in ~\d+(\.5)? hrs?$/)
    expect(laundry.pills[1]!.text).toBe('Clear sky')
    expect(carWash.result).toMatchObject({ status: 'ok', verdict: 'go' })
    expect(carWash.pills.map((p) => p.kind)).toEqual(['condition'])
  })

  it('Not yet: rain above 60% in the window', () => {
    const forecast = makeForecast({
      days: 7,
      hour: { precipProbability: 80, weatherCode: 95 },
    })
    const { laundry, carWash } = getCardContent(forecast, 0, now)
    expect(laundry.result).toMatchObject({ verdict: 'notYet', subLabel: 'Better to wait' })
    expect(carWash.result).toMatchObject({ verdict: 'notYet', subLabel: 'Rain will undo it' })
    expect(laundry.pills.at(-1)!.text).toBe('Thunderstorm')
  })

  it('Caution: rain between 30% and 60%', () => {
    const forecast = makeForecast({ days: 7, hour: { precipProbability: 45 } })
    const { laundry } = getCardContent(forecast, 0, now)
    expect(laundry.result).toMatchObject({ verdict: 'caution', subLabel: 'Dry indoors as backup' })
  })

  it('late in the day laundry moves to tomorrow and says so', () => {
    const { laundry } = getCardContent(makeForecast({ days: 7 }), 0, at(0, 17.5))
    expect(laundry.result).toMatchObject({ status: 'ok', forTomorrow: true })
    expect(laundry.result.status === 'ok' && laundry.result.subLabel).toContain('tomorrow')
  })

  it('shows "Dries tomorrow" when the washing will not dry before dark', () => {
    const forecast = makeForecast({
      days: 7,
      hour: { temperature: 8, relativeHumidity: 95, windSpeed: 0, cloudCover: 100 },
    })
    const { laundry } = getCardContent(forecast, 0, at(0, 9))
    expect(laundry.pills[0]).toMatchObject({ kind: 'drying', text: 'Dries tomorrow' })
  })

  it('unavailable when too many hours miss the rain value: no pills', () => {
    const forecast = makeForecast({ days: 7, hour: { precipProbability: null } })
    const { laundry, carWash } = getCardContent(forecast, 0, now)
    expect(laundry.result.status).toBe('unavailable')
    expect(carWash.result.status).toBe('unavailable')
    expect(laundry.pills).toEqual([])
    expect(carWash.pills).toEqual([])
  })

  it("uses the day's code when the current hour has none", () => {
    const forecast = makeForecast({ days: 7, hour: { weatherCode: null } })
    forecast.daily[0]!.weatherCode = 3
    const { laundry } = getCardContent(forecast, 0, now)
    expect(laundry.pills.at(-1)!.text).toBe('Overcast')
  })

  it('falls back to the unavailable-weather label when no code is known', () => {
    const forecast = makeForecast({ days: 7, hour: { weatherCode: null } })
    forecast.daily[0]!.weatherCode = null
    const { laundry } = getCardContent(forecast, 0, now)
    expect(laundry.pills.at(-1)!.text).toBe('Weather unavailable')
  })

  it('uses the night icon for the current hour after dark', () => {
    const forecast = makeForecast({
      days: 7,
      hours: (_, time) => (time >= at(0, 18) ? { isDay: false } : undefined),
    })
    const { carWash } = getCardContent(forecast, 0, at(0, 20))
    expect(carWash.pills.at(-1)).toMatchObject({ kind: 'condition', isDay: false })
  })
})

describe('getCardContent: another day', () => {
  it('matches the day-anchored verdicts used by Other Days', () => {
    const forecast = makeForecast({
      days: 7,
      hours: (i) => (i >= 24 && i < 48 ? { precipProbability: 70 } : undefined),
    })
    const days = computeDayVerdicts(forecast)
    const { laundry, carWash } = getCardContent(forecast, 1, at(0, 8))
    expect(laundry.result).toEqual(days[1]!.laundry)
    expect(carWash.result).toEqual(days[1]!.carWash)
    expect(laundry.result).toMatchObject({ verdict: 'notYet' })
  })

  it("uses that day's weather code for the condition pill", () => {
    const forecast = makeForecast({ days: 7 })
    forecast.daily[2]!.weatherCode = 61
    const { carWash } = getCardContent(forecast, 2, at(0, 8))
    expect(carWash.pills.at(-1)!.text).toBe('Light rain')
  })

  it('is unavailable for a day the forecast does not have', () => {
    const { laundry } = getCardContent(makeForecast({ days: 2 }), 5, at(0, 8))
    expect(laundry.result.status).toBe('unavailable')
    expect(laundry.pills).toEqual([])
  })
})
