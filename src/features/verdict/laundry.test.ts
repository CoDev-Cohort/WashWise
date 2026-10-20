import { describe, expect, it } from 'vitest'
import { at, makeForecast } from './__fixtures__/builders'
import { computeLaundryForDay, computeLaundryVerdict, laundryRules } from './laundry'
import type { VerdictResult } from './types'

const ok = (r: VerdictResult) => {
  if (r.status !== 'ok') throw new Error(`expected ok, got ${r.status}`)
  return r
}

describe('laundryRules — FR-004b boundaries', () => {
  const fast = { kind: 'hours', hours: 2 } as const

  it.each([
    [29.9, 'go'],
    [30, 'caution'],
    [60, 'caution'],
    [60.1, 'notYet'],
  ] as const)('rain %s%% → %s', (pct, verdict) => {
    expect(laundryRules(pct, fast).verdict).toBe(verdict)
  })

  it.each([
    [4, 'go'],
    [4.01, 'caution'],
    [8, 'caution'],
    [8.01, 'notYet'],
  ] as const)('drying %s h → %s', (hours, verdict) => {
    expect(laundryRules(0, { kind: 'hours', hours }).verdict).toBe(verdict)
  })

  it('won’t dry before dark → Not yet', () => {
    expect(laundryRules(0, { kind: 'tomorrow' })).toMatchObject({
      verdict: 'notYet',
      reasons: ['wontDryBeforeDark'],
    })
  })

  it('most severe wins, and rain is the Caution cause when both apply', () => {
    expect(laundryRules(70, { kind: 'hours', hours: 5 }).verdict).toBe('notYet')
    expect(laundryRules(40, { kind: 'hours', hours: 5 })).toMatchObject({
      verdict: 'caution',
      cautionCause: 'rain',
    })
    expect(laundryRules(10, { kind: 'hours', hours: 5 })).toMatchObject({
      verdict: 'caution',
      cautionCause: 'drying',
    })
  })
})

describe('computeLaundryVerdict — today', () => {
  it('sunny morning → Go Wash, window = 6 h from now', () => {
    const r = ok(computeLaundryVerdict(makeForecast(), at(0, 9)))
    expect(r).toMatchObject({ verdict: 'go', subLabel: 'Good to go', forTomorrow: false })
    expect(r.window).toEqual({ start: at(0, 9), end: at(0, 15) })
    expect(r.drying?.kind).toBe('hours')
  })

  it('uses the worst hour in the window (FR-004a)', () => {
    const f = makeForecast({
      hours: (_, t) => (t === at(0, 12) ? { precipProbability: 45 } : undefined),
    })
    expect(ok(computeLaundryVerdict(f, at(0, 9)))).toMatchObject({
      verdict: 'caution',
      subLabel: 'Dry indoors as backup',
    })
  })

  it('ignores rain outside the 6 h window', () => {
    const f = makeForecast({
      hours: (_, t) => (t === at(0, 16) ? { precipProbability: 90 } : undefined),
    })
    expect(ok(computeLaundryVerdict(f, at(0, 9))).verdict).toBe('go')
  })

  it('caps the window at the end of usable daylight', () => {
    expect(ok(computeLaundryVerdict(makeForecast(), at(0, 14))).window).toEqual({
      start: at(0, 14),
      end: at(0, 17),
    })
  })

  it('before sunrise, starts at sunrise', () => {
    expect(ok(computeLaundryVerdict(makeForecast(), at(0, 3))).window.start).toBe(at(0, 6))
  })

  it('slow-drying day → Caution "Slow drying day"', () => {
    const f = makeForecast({
      hour: { temperature: 18, relativeHumidity: 70, windSpeed: 5, cloudCover: 75 },
    })
    expect(ok(computeLaundryVerdict(f, at(0, 7)))).toMatchObject({
      verdict: 'caution',
      subLabel: 'Slow drying day',
    })
  })

  it('cold, damp day → Not yet "Better to wait"', () => {
    const f = makeForecast({
      hour: { temperature: 10, relativeHumidity: 90, windSpeed: 0, cloudCover: 100 },
    })
    expect(ok(computeLaundryVerdict(f, at(0, 7)))).toMatchObject({
      verdict: 'notYet',
      subLabel: 'Better to wait',
    })
  })
})

describe('computeLaundryVerdict — switch to tomorrow (FR-001)', () => {
  // Usable daylight ends at 17:00.
  it('2:00 left → stays on today', () => {
    expect(ok(computeLaundryVerdict(makeForecast(), at(0, 15))).forTomorrow).toBe(false)
  })

  it('1:59 left → assesses tomorrow from sunrise', () => {
    const r = ok(computeLaundryVerdict(makeForecast(), at(0, 15 + 1 / 60)))
    expect(r).toMatchObject({ forTomorrow: true, subLabel: 'Good to go tomorrow morning' })
    expect(r.window).toEqual({ start: at(1, 6), end: at(1, 12) })
  })

  it('at night → tomorrow, with tomorrow wording for each verdict', () => {
    const rainy = makeForecast({
      hours: (_, t) => (t >= at(1, 0) ? { precipProbability: 80 } : undefined),
    })
    expect(ok(computeLaundryVerdict(rainy, at(0, 22)))).toMatchObject({
      verdict: 'notYet',
      subLabel: 'Better to wait — tomorrow looks wet',
    })
    const showers = makeForecast({
      hours: (_, t) => (t >= at(1, 0) ? { precipProbability: 40 } : undefined),
    })
    expect(ok(computeLaundryVerdict(showers, at(0, 22))).subLabel).toBe(
      'Tomorrow: dry indoors as backup',
    )
    const slow = makeForecast({
      hour: { temperature: 18, relativeHumidity: 70, windSpeed: 5, cloudCover: 75 },
    })
    expect(ok(computeLaundryVerdict(slow, at(0, 22))).subLabel).toBe('Tomorrow: slow drying day')
  })

  it('unavailable when tomorrow is past the forecast end', () => {
    expect(computeLaundryVerdict(makeForecast({ days: 1 }), at(0, 22)).status).toBe('unavailable')
  })
})

describe('computeLaundryVerdict — polar (FR-004d)', () => {
  // Open-Meteo reports polar night as sunrise == sunset == the day's start; null covers missing data.
  describe.each([
    ['sunrise == sunset', { sunrise: 0, sunset: 0, daylightDuration: 0 }],
    ['no sunrise/sunset', { sunrise: null, sunset: null, daylightDuration: 0 }],
  ])('polar night (%s)', (_, night) => {
    it('polar night today but sun tomorrow → switches to tomorrow, not forced Not yet', () => {
      const f = makeForecast({ day: (i) => (i === 0 ? night : undefined) })
      expect(ok(computeLaundryVerdict(f, at(0, 12)))).toMatchObject({
        verdict: 'go',
        forTomorrow: true,
      })
    })

    it('polar night today and tomorrow → Not yet', () => {
      const f = makeForecast({ day: () => night })
      expect(ok(computeLaundryVerdict(f, at(0, 12)))).toMatchObject({
        verdict: 'notYet',
        reasons: ['noDaylight'],
        forTomorrow: true,
      })
    })
  })

  it('polar day → usable all day, dries before the end of the day', () => {
    const f = makeForecast({ day: () => ({ sunrise: 0, sunset: 24, daylightDuration: 86_400 }) })
    const r = ok(computeLaundryVerdict(f, at(0, 21)))
    expect(r).toMatchObject({ verdict: 'go', forTomorrow: false })
    expect(r.window).toEqual({ start: at(0, 21), end: at(1, 0) })
  })
})

describe('computeLaundryVerdict — missing data (FR-004c)', () => {
  it('skips a missing hour within the 25% allowance', () => {
    const f = makeForecast({
      hours: (_, t) => (t === at(0, 10) ? { precipProbability: null } : undefined),
    })
    expect(ok(computeLaundryVerdict(f, at(0, 9))).verdict).toBe('go')
  })

  it('more than 25% missing → Verdict unavailable', () => {
    const f = makeForecast({
      hours: (_, t) => (t >= at(0, 9) && t < at(0, 11) ? { precipProbability: null } : undefined),
    })
    expect(computeLaundryVerdict(f, at(0, 9))).toEqual({
      status: 'unavailable',
      activity: 'laundry',
      reason: 'missingData',
    })
  })
})

describe('computeLaundryVerdict — missing drying inputs (FR-004c)', () => {
  // From 09:00 the window is 09–15 (6 h) and drying reads 09–11 (~2.5 h): 6 hours checked in all.
  it('counts missing drying inputs in the drying span toward the 25% limit', () => {
    const f = makeForecast({
      hours: (_, t) =>
        t === at(0, 10)
          ? { relativeHumidity: null }
          : t === at(0, 11)
            ? { cloudCover: null }
            : undefined,
    })
    expect(computeLaundryVerdict(f, at(0, 9)).status).toBe('unavailable')
  })

  it('still gives a verdict just under the limit', () => {
    const f = makeForecast({
      hours: (_, t) => (t === at(0, 10) ? { windSpeed: null } : undefined),
    })
    expect(ok(computeLaundryVerdict(f, at(0, 9))).verdict).toBe('go')
  })
})

describe('computeLaundryForDay', () => {
  it('uses the first 6 usable-daylight hours of that day', () => {
    const r = ok(computeLaundryForDay(makeForecast(), 2))
    expect(r.window).toEqual({ start: at(2, 6), end: at(2, 12) })
    expect(r.forTomorrow).toBe(false)
  })
})
