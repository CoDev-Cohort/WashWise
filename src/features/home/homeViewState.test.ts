import { describe, expect, it } from 'vitest'
import { ForecastError } from '@/features/forecast/errors'
import type { Forecast } from '@/features/forecast/types'
import { getHomeViewState, type LastGood } from './homeViewState'

const current = { lat: 14.6, lon: 120.98 }
const fresh = { timezone: 'fresh' } as Forecast
const old = { timezone: 'old' } as Forecast
const error = new ForecastError('network', 'x')
const sameCell: LastGood = { data: old, coords: { lat: 14.6, lon: 120.98 } }
const otherCell: LastGood = { data: old, coords: { lat: 10.31, lon: 123.89 } }

describe('getHomeViewState', () => {
  it.each([
    [
      'first load',
      { data: undefined, error: null, isFetching: true },
      undefined,
      { kind: 'loading' },
    ],
    [
      'retrying after a failed first load',
      { data: undefined, error, isFetching: true },
      undefined,
      { kind: 'loading' },
    ],
    [
      'first load failed',
      { data: undefined, error, isFetching: false },
      undefined,
      { kind: 'error', error },
    ],
    [
      'loaded',
      { data: fresh, error: null, isFetching: false },
      sameCell,
      { kind: 'ready', data: fresh, stale: false },
    ],
    [
      'background update failed, data kept by the query',
      { data: fresh, error, isFetching: false },
      sameCell,
      { kind: 'ready', data: fresh, stale: true, error, previousLocation: false },
    ],
    [
      'retrying a failed background update',
      { data: fresh, error, isFetching: true },
      sameCell,
      { kind: 'ready', data: fresh, stale: true, error, previousLocation: false },
    ],
    [
      'new cell failed: the query dropped its placeholder',
      { data: undefined, error, isFetching: false },
      otherCell,
      { kind: 'ready', data: old, stale: true, error, previousLocation: true },
    ],
    [
      'retrying the new cell',
      { data: undefined, error, isFetching: true },
      otherCell,
      { kind: 'ready', data: old, stale: true, error, previousLocation: true },
    ],
    [
      'loading with only the last good forecast',
      { data: undefined, error: null, isFetching: true },
      otherCell,
      { kind: 'ready', data: old, stale: false },
    ],
  ] as const)('%s', (_, query, lastGood, expected) => {
    expect(getHomeViewState(query, lastGood, current)).toEqual(expected)
  })
})
