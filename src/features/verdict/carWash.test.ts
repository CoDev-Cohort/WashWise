import { describe, expect, it } from 'vitest'
import { at, makeForecast } from './__fixtures__/builders'
import { carWashRules, computeCarWashForDay, computeCarWashVerdict } from './carWash'
import type { VerdictResult } from './types'

const ok = (r: VerdictResult) => {
  if (r.status !== 'ok') throw new Error(`expected ok, got ${r.status}`)
  return r
}

describe('carWashRules — FR-004b boundaries', () => {
  it.each([
    [29.9, 'go'],
    [30, 'caution'],
    [60, 'caution'],
    [60.1, 'notYet'],
  ] as const)('rain %s%% → %s', (pct, verdict) => {
    expect(carWashRules(pct, 0, 0).verdict).toBe(verdict)
  })

  it.each([
    [0.49, 0, 'go', 'Good to go'],
    [0.5, 0, 'caution', 'Light rain expected today'],
    [1.99, 0, 'caution', 'Light rain expected today'],
    [2, 0, 'notYet', 'Rain will undo it'],
    [0, 0.49, 'go', 'Good to go'],
    [0, 0.5, 'caution', 'Rain likely tomorrow'],
    [0, 1.99, 'caution', 'Rain likely tomorrow'],
    [0, 2, 'caution', 'Rain likely tomorrow'],
    [0.25, 0.25, 'caution', 'Rain likely tomorrow'],
  ] as const)('day 1 %s mm, day 2 %s mm → %s', (d1, d2, verdict, subLabel) => {
    expect(carWashRules(0, d1, d2)).toMatchObject({ verdict, subLabel })
  })

  it.each([
    [0, 0.3, 0.3, ['rainTotal']],
    [40, 0.3, 0.3, ['rainModerate']],
    [0, 0.2, 0.5, ['rainDay2']],
  ] as const)('rain %s%%, %s + %s mm → Caution reasons %j', (pct, d1, d2, reasons) => {
    expect(carWashRules(pct, d1, d2)).toMatchObject({ verdict: 'caution', reasons })
  })

  it('"Light rain expected today" takes precedence over "Rain likely tomorrow"', () => {
    expect(carWashRules(40, 1, 1).subLabel).toBe('Light rain expected today')
  })
})

describe('computeCarWashVerdict', () => {
  it('dry 48 h → Go Wash', () => {
    const r = ok(computeCarWashVerdict(makeForecast(), at(0, 9.5)))
    expect(r).toMatchObject({ verdict: 'go', subLabel: 'Good to go' })
    expect(r.window).toEqual({ start: at(0, 9), end: at(2, 9) })
  })

  it('sums rain in each 24 h half, with 0.1 mm values adding up to exactly 0.5', () => {
    const f = makeForecast({
      hours: (_, t) => (t >= at(0, 10) && t < at(0, 15) ? { precipitation: 0.1 } : undefined),
    })
    expect(ok(computeCarWashVerdict(f, at(0, 9))).subLabel).toBe('Light rain expected today')
  })

  it('heavy rain on day 2 only → Caution', () => {
    const f = makeForecast({
      hours: (_, t) => (t === at(1, 15) ? { precipitation: 3 } : undefined),
    })
    expect(ok(computeCarWashVerdict(f, at(0, 9)))).toMatchObject({
      verdict: 'caution',
      reasons: ['rainDay2'],
    })
  })

  it('more than 25% missing → Verdict unavailable', () => {
    const f = makeForecast({ hours: (i) => (i % 3 === 0 ? { precipitation: null } : undefined) })
    expect(computeCarWashVerdict(f, at(0, 0)).status).toBe('unavailable')
  })
})

describe('computeCarWashForDay (FR-004f)', () => {
  it('starts at that day’s sunrise', () => {
    expect(ok(computeCarWashForDay(makeForecast(), 1)).window.start).toBe(at(1, 6))
  })

  it('truncates at the forecast end without counting those hours as missing', () => {
    const r = ok(computeCarWashForDay(makeForecast({ days: 3 }), 2))
    expect(r.window).toEqual({ start: at(2, 6), end: at(3, 0) })
    expect(r.verdict).toBe('go')
  })
})
