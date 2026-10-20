import london from './real/london-2026-10-20.json'
import longyearbyen from './real/longyearbyen-2026-10-20.json'
import manila from './real/manila-2026-10-20.json'
import mcmurdo from './real/mcmurdo-2026-10-20.json'
import phoenix from './real/phoenix-2026-10-20.json'

export interface RealFixture {
  meta: { place: string; lat: number; lon: number; why: string; recordedAt: string; url: string }
  response: unknown
}

/** Real Open-Meteo responses recorded by `pnpm fixtures:record` (plan R1–R3). */
export const REAL_FIXTURES: RealFixture[] = [manila, london, phoenix, longyearbyen, mcmurdo]

export const POLAR_PLACES = new Set(['longyearbyen', 'mcmurdo'])
