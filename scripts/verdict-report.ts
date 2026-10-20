/**
 * Verdict distribution per fixture location (plan R2) and the gate checked before P3.
 *
 *   pnpm verdict:report          # print the table
 *   pnpm verdict:report --gate   # also exit 1 if a gate fails
 */
import { pathToFileURL } from 'node:url'
import { REAL_FIXTURES } from '../src/features/forecast/__fixtures__/realFixtures'
import { normalizeForecast } from '../src/features/forecast/normalize'
import type { Forecast } from '../src/features/forecast/types'
import {
  computeCarWashVerdict,
  computeDayVerdicts,
  computeLaundryVerdict,
} from '../src/features/verdict'
import type { VerdictResult } from '../src/features/verdict'

type Bucket = 'go' | 'caution' | 'notYet' | 'unavailable'
export type Shares = Record<Bucket, number>

const bucket = (r: VerdictResult): Bucket => (r.status === 'ok' ? r.verdict : 'unavailable')

function shares(results: VerdictResult[]): Shares {
  const s: Shares = { go: 0, caution: 0, notYet: 0, unavailable: 0 }
  for (const r of results) s[bucket(r)]++
  for (const k of Object.keys(s) as Bucket[]) s[k] = results.length ? s[k] / results.length : 0
  return s
}

export interface PlaceReport {
  place: string
  samples: number
  laundry: Shares
  carWash: Shares
  laundryGoDays: number
}

/** Samples every daylight hour of the first 5 days (so the 48 h car-wash window stays inside the forecast). */
export function reportFor(place: string, forecast: Forecast): PlaceReport {
  const lastStart = forecast.daily[5]?.start ?? Infinity
  const times = forecast.hourly.filter((h) => h.isDay && h.time < lastStart).map((h) => h.time)
  return {
    place,
    samples: times.length,
    laundry: shares(times.map((t) => computeLaundryVerdict(forecast, t))),
    carWash: shares(times.map((t) => computeCarWashVerdict(forecast, t))),
    laundryGoDays: computeDayVerdicts(forecast).filter(
      (d) => d.laundry.status === 'ok' && d.laundry.verdict === 'go',
    ).length,
  }
}

export interface GateResult {
  name: string
  pass: boolean
  detail: string
}

const pct = (n: number) => `${Math.round(n * 100)}%`

export function evaluateGates(reports: PlaceReport[]): GateResult[] {
  const by = (p: string) => reports.find((r) => r.place === p)!
  const gates: GateResult[] = []
  for (const place of ['london', 'phoenix']) {
    const r = by(place)
    const blocked = r.carWash.caution + r.carWash.notYet
    gates.push({
      name: `${place}: car wash Caution+Not yet ≤ 70%`,
      pass: blocked <= 0.7,
      detail: pct(blocked),
    })
  }
  const phoenix = by('phoenix')
  gates.push({
    name: 'phoenix: laundry Go on ≥ 1 day',
    pass: phoenix.laundryGoDays >= 1,
    detail: `${phoenix.laundryGoDays} day(s)`,
  })
  for (const r of reports.filter((x) => !['longyearbyen', 'mcmurdo'].includes(x.place))) {
    const worst = Math.max(r.laundry.unavailable, r.carWash.unavailable)
    gates.push({ name: `${r.place}: unavailable < 2%`, pass: worst < 0.02, detail: pct(worst) })
  }
  return gates
}

function main() {
  const reports = REAL_FIXTURES.map((f) =>
    reportFor(f.meta.place, normalizeForecast(f.response, 0)),
  )
  const row = (s: Shares) => [s.go, s.caution, s.notYet, s.unavailable].map(pct).join(' / ')
  console.log(
    'Place          Samples  Laundry go/caution/notYet/unavail    Car wash go/caution/notYet/unavail',
  )
  for (const r of reports) {
    console.log(
      `${r.place.padEnd(14)} ${String(r.samples).padStart(7)}  ${row(r.laundry).padEnd(36)} ${row(r.carWash)}`,
    )
  }
  console.log('\nGates (before P3):')
  const gates = evaluateGates(reports)
  for (const g of gates) console.log(`  ${g.pass ? '✔' : '✖'} ${g.name} — ${g.detail}`)
  if (process.argv.includes('--gate') && gates.some((g) => !g.pass)) process.exit(1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
