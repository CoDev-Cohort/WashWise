/**
 * Records real Open-Meteo responses for the golden verdict tests (plan R1–R3).
 * Re-run deliberately; recorded fixtures are committed.
 *
 *   pnpm fixtures:record
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { buildForecastUrl } from '../src/features/forecast/query'

const PLACES = [
  { place: 'manila', lat: 14.6, lon: 120.98, why: 'Humid tropical' },
  { place: 'london', lat: 51.51, lon: -0.13, why: 'Temperate; DST ends 2026-10-25' },
  { place: 'phoenix', lat: 33.45, lon: -112.07, why: 'Dry and sunny' },
  { place: 'longyearbyen', lat: 78.22, lon: 15.65, why: 'Polar night begins ~2026-10-26' },
  { place: 'mcmurdo', lat: -77.85, lon: 166.67, why: 'Polar day begins ~2026-10-24' },
]

const OUT_DIR = 'src/features/forecast/__fixtures__/real'

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  const recordedAt = new Date().toISOString()
  const date = recordedAt.slice(0, 10)
  for (const p of PLACES) {
    const url = buildForecastUrl(p.lat, p.lon)
    const res = await fetch(url)
    if (!res.ok) throw new Error(`${p.place}: HTTP ${res.status} ${await res.text()}`)
    const response = await res.json()
    const file = `${OUT_DIR}/${p.place}-${date}.json`
    writeFileSync(file, JSON.stringify({ meta: { ...p, recordedAt, url }, response }) + '\n')
    console.log(`✔ ${file}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
