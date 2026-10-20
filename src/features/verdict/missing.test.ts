import { describe, expect, it } from 'vitest'
import { makeForecast } from './__fixtures__/builders'
import { exceedsMissingRatio } from './missing'

const rainMissing = (h: { precipProbability: number | null }) => h.precipProbability === null

describe('exceedsMissingRatio', () => {
  // 100 hours so percentages are exact.
  const withMissing = (n: number) =>
    makeForecast({
      days: 5,
      hours: (i) => (i < n ? { precipProbability: null } : undefined),
    }).hourly.slice(0, 100)

  it('allows exactly 25% missing', () => {
    expect(exceedsMissingRatio(withMissing(25), rainMissing)).toBe(false)
  })

  it('rejects 26% missing', () => {
    expect(exceedsMissingRatio(withMissing(26), rainMissing)).toBe(true)
  })

  it('treats no hours as missing', () => {
    expect(exceedsMissingRatio([], rainMissing)).toBe(true)
  })
})
