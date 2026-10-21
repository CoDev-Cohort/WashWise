import { describe, expect, it } from 'vitest'
import { makeForecast } from '@/features/verdict/__fixtures__/builders'
import { buildDayStrip, dateLabel, weekdayLabel } from './dayStrip'

describe('buildDayStrip', () => {
  it('starts with Today, then weekday and date', () => {
    const strip = buildDayStrip(makeForecast({ days: 7 }))
    expect(strip).toHaveLength(6)
    expect(strip.map((d) => d.label)).toEqual(['Today', 'THU', 'FRI', 'SAT', 'SUN', 'MON'])
    expect(strip.map((d) => d.dateLabel)).toEqual(['21', '22', '23', '24', '25', '26'])
    expect(strip.map((d) => d.isToday)).toEqual([true, false, false, false, false, false])
    expect(strip.map((d) => d.index)).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('shows only the days the forecast has', () => {
    expect(buildDayStrip(makeForecast({ days: 3 }))).toHaveLength(3)
  })

  it('carries the daily weather code', () => {
    const forecast = makeForecast({ days: 2 })
    forecast.daily[1]!.weatherCode = 61
    expect(buildDayStrip(forecast).map((d) => d.weatherCode)).toEqual([0, 61])
  })

  it.each([
    ['UTC', 0],
    ['Pacific/Auckland', 13 * 3600],
    ['America/Los_Angeles', -7 * 3600],
    ['Pacific/Kiritimati', 14 * 3600],
  ])('labels come from the location date, whatever its time zone (%s)', (timezone, offset) => {
    const forecast = { ...makeForecast({ days: 2 }), timezone, utcOffsetSeconds: offset }
    const strip = buildDayStrip(forecast)
    expect(strip.map((d) => `${d.label} ${d.dateLabel}`)).toEqual(['Today 21', 'THU 22'])
  })
})

describe('date labels', () => {
  it.each([
    ['2026-10-21', 'WED', '21'],
    ['2026-10-31', 'SAT', '31'],
    ['2026-11-01', 'SUN', '1'],
    ['2026-12-31', 'THU', '31'],
    ['2028-02-29', 'TUE', '29'],
    ['2026-03-29', 'SUN', '29'], // a clock-change day in Europe
  ])('%s → %s %s', (date, weekday, day) => {
    expect(weekdayLabel(date)).toBe(weekday)
    expect(dateLabel(date)).toBe(day)
  })
})
