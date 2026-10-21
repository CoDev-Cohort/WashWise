import { describe, expect, it } from 'vitest'
import { at, HOUR, makeForecast } from '@/features/verdict/__fixtures__/builders'
import { formatHour, getRainBars } from './rainWindow'

/** Rain chance equals the hour index from T0, so a bar's value says which hour it is. */
const forecast = (days = 7) =>
  makeForecast({ days, hours: (i) => ({ precipProbability: i % 100 }) })

describe('formatHour', () => {
  it.each([
    [0, '12 AM'],
    [1, '1 AM'],
    [11, '11 AM'],
    [12, '12 PM'],
    [13, '1 PM'],
    [23, '11 PM'],
  ])('%i → %s', (hour, label) => {
    expect(formatHour(hour)).toBe(label)
  })
})

describe('getRainBars: Today', () => {
  it.each([
    ['09:30', 9.5, [9, 10, 11, 12, 13], '9 AM'],
    ['09:00 exactly', 9, [9, 10, 11, 12, 13], '9 AM'],
    ['00:10', 0.17, [0, 1, 2, 3, 4], '12 AM'],
    ['19:45', 19.75, [19, 20, 21, 22, 23], '7 PM'],
  ])('now at %s → the next 5 hours from the current one', (_name, hour, expected, firstLabel) => {
    const bars = getRainBars(forecast(), 0, at(0, hour))
    expect(bars.map((b) => b.percent)).toEqual(expected)
    expect(bars[0]!.hourLabel).toBe(firstLabel)
    expect(bars.some((b) => b.isNextDay)).toBe(false)
  })

  it.each([
    ['22:30', 22.5, [22, 23, 24, 25, 26], [false, false, true, true, true]],
    ['23:30', 23.5, [23, 24, 25, 26, 27], [false, true, true, true, true]],
  ])('now at %s → rolls into tomorrow and marks those bars', (_n, hour, expected, nextDay) => {
    const bars = getRainBars(forecast(), 0, at(0, hour))
    expect(bars.map((b) => b.percent)).toEqual(expected)
    expect(bars.map((b) => b.isNextDay)).toEqual(nextDay)
    expect(bars.find((b) => b.isNextDay)!.hourLabel).toBe('12 AM')
  })

  it('shows fewer bars only when the forecast itself ends', () => {
    const f = forecast(2)
    // The forecast ends at hour 47, so two hours remain from 22:00 on its last day.
    const tail = getRainBars(f, 0, at(1, 22))
    expect(tail.map((b) => b.percent)).toEqual([46, 47])
  })

  it('starts at the first hour when now is before the forecast', () => {
    const bars = getRainBars(forecast(), 0, at(0, 0) - 3 * HOUR)
    expect(bars.map((b) => b.percent)).toEqual([0, 1, 2, 3, 4])
  })

  it('keeps a missing value as null, not 0%', () => {
    const f = makeForecast({
      days: 3,
      hours: (i) => ({ precipProbability: i === 10 ? null : 40 }),
    })
    const bars = getRainBars(f, 0, at(0, 9))
    expect(bars.map((b) => b.percent)).toEqual([40, null, 40, 40, 40])
  })
})

describe('getRainBars: another day', () => {
  it('shows 12 PM to 4 PM of that day', () => {
    const bars = getRainBars(forecast(), 2, at(0, 9))
    expect(bars.map((b) => b.hourLabel)).toEqual(['12 PM', '1 PM', '2 PM', '3 PM', '4 PM'])
    expect(bars.map((b) => b.percent)).toEqual([60, 61, 62, 63, 64])
    expect(bars.every((b) => !b.isNextDay)).toBe(true)
  })

  it('does not depend on the current time', () => {
    const f = forecast()
    expect(getRainBars(f, 3, at(0, 1))).toEqual(getRainBars(f, 3, at(0, 23.5)))
  })

  it('reads the wall clock of the location, not the device', () => {
    // A location at UTC+8: its local midnight is 16:00 UTC the day before.
    const offset = 8 * 3600
    const f = makeForecast({ days: 4, hours: (i) => ({ precipProbability: i % 100 }) })
    const shifted = {
      ...f,
      utcOffsetSeconds: offset,
      daily: f.daily.map((d) => ({ ...d, start: d.start - offset * 1000 })),
      hourly: f.hourly.map((h) => ({ ...h, time: h.time - offset * 1000 })),
    }
    const bars = getRainBars(shifted, 1, at(0, 9) - offset * 1000)
    expect(bars.map((b) => b.hourLabel)).toEqual(['12 PM', '1 PM', '2 PM', '3 PM', '4 PM'])
  })

  it('keeps five bars on a 23 h and a 25 h clock-change day', () => {
    for (const length of [23, 25]) {
      const f = makeForecast({
        days: 3,
        day: (i) => (i === 1 ? { length } : undefined),
        hours: (i) => ({ precipProbability: i % 100 }),
      })
      expect(getRainBars(f, 1, at(0, 9))).toHaveLength(5)
    }
  })

  it('returns nothing for a day the forecast does not have', () => {
    expect(getRainBars(forecast(2), 4, at(0, 9))).toEqual([])
  })
})
