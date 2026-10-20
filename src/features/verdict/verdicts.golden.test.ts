/**
 * Golden verdicts over real recorded forecasts (plan R1). A person reviews the snapshot
 * against the actual weather; afterwards, any formula or threshold change shows up as a diff.
 */
import { describe, expect, it } from 'vitest'
import { REAL_FIXTURES } from '@/features/forecast/__fixtures__/realFixtures'
import { normalizeForecast } from '@/features/forecast/normalize'
import type { Forecast } from '@/features/forecast/types'
import type { VerdictResult } from './types'
import {
  computeCarWashVerdict,
  computeDayVerdicts,
  computeLaundryVerdict,
  toOtherDaysLabel,
} from '.'

const LOCAL_TIMES: [string, number][] = [
  ['07:00', 7],
  ['13:00', 13],
  ['17:30', 17.5],
  ['22:00', 22],
]

function summarize(r: VerdictResult): string {
  if (r.status !== 'ok') return 'unavailable'
  const drying =
    r.drying === undefined
      ? ''
      : r.drying.kind === 'tomorrow'
        ? ' · dries tomorrow'
        : ` · dries ${r.drying.hours.toFixed(1)} h`
  return `${r.verdict} — ${r.subLabel}${r.forTomorrow ? ' (tomorrow)' : ''}${drying} [${r.reasons.join(', ')}]`
}

function weatherAt(f: Forecast, now: number): string {
  const h = f.hourly.find((x) => x.time <= now && now < x.time + 3_600_000)
  return h
    ? `${h.temperature}°C ${h.relativeHumidity}% ${h.windSpeed}km/h cloud ${h.cloudCover}% rain ${h.precipProbability}%`
    : '?'
}

describe.each(REAL_FIXTURES.map((f) => [f.meta.place, f] as const))('%s', (_, fixture) => {
  const forecast = normalizeForecast(fixture.response, 0)
  const day0 = forecast.daily[0]!.start

  it('today at fixed local times', () => {
    const rows = Object.fromEntries(
      LOCAL_TIMES.map(([label, hour]) => {
        const now = day0 + hour * 3_600_000
        return [
          label,
          {
            weather: weatherAt(forecast, now),
            laundry: summarize(computeLaundryVerdict(forecast, now)),
            carWash: summarize(computeCarWashVerdict(forecast, now)),
          },
        ]
      }),
    )
    expect(rows).toMatchSnapshot()
  })

  it('other days', () => {
    const days = computeDayVerdicts(forecast).map(
      (d) =>
        `${d.date}  laundry ${toOtherDaysLabel(d.laundry)}  car ${toOtherDaysLabel(d.carWash)}`,
    )
    expect(days).toMatchSnapshot()
  })
})
