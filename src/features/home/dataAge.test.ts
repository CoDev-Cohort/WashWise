import { describe, expect, it } from 'vitest'
import { formatDataAge } from './dataAge'

const NOW = 1_800_000_000_000
const S = 1000
const MIN = 60 * S
const H = 60 * MIN

describe('formatDataAge', () => {
  it.each([
    [-5 * S, 'just now'],
    [0, 'just now'],
    [59 * S, 'just now'],
    [60 * S, '1 min ago'],
    [59 * MIN + 59 * S, '59 min ago'],
    [60 * MIN, '1 h ago'],
    [23 * H + 59 * MIN, '23 h ago'],
    [24 * H, '1 day ago'],
    [47 * H, '1 day ago'],
    [48 * H, '2 days ago'],
    [6 * 24 * H, '6 days ago'],
  ])('%i ms old → %s', (age, expected) => {
    expect(formatDataAge(NOW - age, NOW)).toBe(expected)
  })
})
