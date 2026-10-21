import { describe, expect, it } from 'vitest'
import { ForecastError } from '@/features/forecast/errors'
import type { DailyPoint, Forecast } from '@/features/forecast/types'
import { getHomeViewState, type LastGood } from './homeViewState'

const DAY = 24 * 60 * 60 * 1000
const TODAY = 1_800_000_000_000
const ONLINE = { online: true, now: TODAY + 3_600_000 }
const OFFLINE = { online: false, now: ONLINE.now }

const forecast = (timezone: string, firstDay = TODAY) =>
  ({ timezone, hourly: [], daily: [{ start: firstDay } as DailyPoint] }) as unknown as Forecast

const current = { lat: 14.6, lon: 120.98 }
const fresh = forecast('fresh')
const old = forecast('old')
const ended = forecast('ended', TODAY - 2 * DAY)
const network = new ForecastError('network', 'x')
const http = new ForecastError('http', 'x', { status: 500 })
const sameCell: LastGood = { data: old, coords: { lat: 14.6, lon: 120.98 } }
const otherCell: LastGood = { data: old, coords: { lat: 10.31, lon: 123.89 } }
const endedCell: LastGood = { data: ended, coords: current }

const q = (data: Forecast | undefined, error: unknown, isFetching: boolean) => ({
  data,
  error,
  isFetching,
})

describe('getHomeViewState', () => {
  it.each([
    // Online (P4.1 behaviour)
    ['first load', q(undefined, null, true), undefined, ONLINE, { kind: 'loading' }],
    [
      'retrying after a failed first load',
      q(undefined, network, true),
      undefined,
      ONLINE,
      { kind: 'loading' },
    ],
    [
      'first load failed',
      q(undefined, network, false),
      undefined,
      ONLINE,
      { kind: 'error', error: network },
    ],
    [
      'loaded',
      q(fresh, null, false),
      sameCell,
      ONLINE,
      { kind: 'ready', data: fresh, stale: false },
    ],
    [
      'a background fetch alone is not stale',
      q(fresh, null, true),
      sameCell,
      ONLINE,
      { kind: 'ready', data: fresh, stale: false },
    ],
    [
      'background update failed, data kept by the query',
      q(fresh, http, false),
      sameCell,
      ONLINE,
      {
        kind: 'ready',
        data: fresh,
        stale: true,
        reason: 'failed',
        error: http,
        previousLocation: false,
      },
    ],
    [
      'navigator.onLine says online but the connection is dead',
      q(fresh, network, true),
      sameCell,
      ONLINE,
      {
        kind: 'ready',
        data: fresh,
        stale: true,
        reason: 'failed',
        error: network,
        previousLocation: false,
      },
    ],
    [
      'new cell failed: the query dropped its placeholder',
      q(undefined, network, false),
      otherCell,
      ONLINE,
      {
        kind: 'ready',
        data: old,
        stale: true,
        reason: 'failed',
        error: network,
        previousLocation: true,
      },
    ],
    [
      'loading with only the last good forecast',
      q(undefined, null, true),
      otherCell,
      ONLINE,
      { kind: 'ready', data: old, stale: false },
    ],
    // Offline (P4.2)
    [
      'offline with a cached forecast, query paused',
      q(fresh, null, false),
      sameCell,
      OFFLINE,
      {
        kind: 'ready',
        data: fresh,
        stale: true,
        reason: 'offline',
        error: null,
        previousLocation: false,
      },
    ],
    [
      'offline cold start: TanStack still tries and fails',
      q(fresh, network, false),
      sameCell,
      OFFLINE,
      {
        kind: 'ready',
        data: fresh,
        stale: true,
        reason: 'offline',
        error: network,
        previousLocation: false,
      },
    ],
    [
      'offline in a new cell: the newest cached forecast from anywhere',
      q(undefined, null, true),
      otherCell,
      OFFLINE,
      {
        kind: 'ready',
        data: old,
        stale: true,
        reason: 'offline',
        error: null,
        previousLocation: true,
      },
    ],
    [
      'offline with nothing cached, paused',
      q(undefined, null, false),
      undefined,
      OFFLINE,
      { kind: 'error', error: null },
    ],
    [
      'offline with nothing cached, fetch running',
      q(undefined, null, true),
      undefined,
      OFFLINE,
      { kind: 'error', error: null },
    ],
    [
      'offline with nothing cached, fetch failed',
      q(undefined, network, false),
      undefined,
      OFFLINE,
      { kind: 'error', error: network },
    ],
    // A forecast whose days have all ended counts as none (FR-017)
    [
      'offline, cached forecast all in the past',
      q(ended, null, false),
      endedCell,
      OFFLINE,
      { kind: 'error', error: null },
    ],
    [
      'online, cached forecast all in the past: refetching',
      q(ended, null, true),
      endedCell,
      ONLINE,
      { kind: 'loading' },
    ],
    [
      'online, cached forecast all in the past and the refetch failed',
      q(ended, http, false),
      endedCell,
      ONLINE,
      { kind: 'error', error: http },
    ],
  ] as const)('%s', (_, query, lastGood, context, expected) => {
    expect(getHomeViewState(query, lastGood, current, context)).toEqual(expected)
  })

  it('shows days from the real today on a forecast fetched yesterday', () => {
    const twoDays = {
      ...fresh,
      daily: [{ start: TODAY - DAY } as DailyPoint, { start: TODAY } as DailyPoint],
    }
    const view = getHomeViewState(q(twoDays, null, false), undefined, current, ONLINE)
    expect(view.kind === 'ready' && view.data.daily.map((d) => d.start)).toEqual([TODAY])
  })
})
