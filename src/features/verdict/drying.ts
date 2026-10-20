import type { EpochMs, HourlyPoint } from '@/features/forecast/types'
import { VERDICT_CONFIG, type VerdictConfig } from './config'
import { HOUR } from './daylight'
import type { DryingEstimate } from './types'

type DryingInputs = Pick<
  HourlyPoint,
  'temperature' | 'relativeHumidity' | 'windSpeed' | 'cloudCover'
>

export const hasDryingInputs = (h: DryingInputs) =>
  h.temperature !== null &&
  h.relativeHumidity !== null &&
  h.windSpeed !== null &&
  h.cloudCover !== null

/** Share of a load dried per hour (1 = fully dry), or `null` when an input is missing. */
export function dryingRate(h: DryingInputs, cfg: VerdictConfig = VERDICT_CONFIG): number | null {
  if (!hasDryingInputs(h)) return null
  const t = h.temperature!
  const { k, vpdExponent, windCoeffPerKmh, windFactorMax, sunCoeff } = cfg.drying
  // Vapour pressure deficit (kPa), Tetens formula.
  const vpd = 0.6108 * Math.exp((17.27 * t) / (t + 237.3)) * (1 - h.relativeHumidity! / 100)
  if (vpd <= 0) return 0
  const wind = Math.min(1 + windCoeffPerKmh * Math.max(0, h.windSpeed!), windFactorMax)
  const sun = 1 + sunCoeff * (1 - h.cloudCover! / 100)
  return k * vpd ** vpdExponent * wind * sun
}

export interface DryingResult {
  estimate: DryingEstimate
  /** Hours the estimate read, for the missing-data check. */
  hoursRead: HourlyPoint[]
}

/**
 * Accumulates hourly drying from `start` until the load is dry or `deadline` (dark) arrives (FR-003).
 * A missing hour reuses the nearest earlier hour's rate, or the next one if there is none (FR-004c).
 */
export function estimateDrying(
  hours: HourlyPoint[],
  start: EpochMs,
  deadline: EpochMs,
  cfg: VerdictConfig = VERDICT_CONFIG,
): DryingResult {
  const span = hours.filter((h) => h.time + HOUR > start && h.time < deadline)
  const rates = span.map((h) => dryingRate(h, cfg))
  const firstKnown = rates.find((r) => r !== null) ?? 0

  let progress = 0
  let carried: number = firstKnown
  for (let i = 0; i < span.length; i++) {
    const h = span[i]!
    carried = rates[i] ?? carried
    const from = Math.max(h.time, start)
    const to = Math.min(h.time + HOUR, deadline)
    const gain = (carried * (to - from)) / HOUR
    if (carried > 0 && progress + gain >= 1) {
      const finish = from + ((1 - progress) / carried) * HOUR
      return {
        estimate: { kind: 'hours', hours: (finish - start) / HOUR },
        hoursRead: span.slice(0, i + 1),
      }
    }
    progress += gain
  }
  return { estimate: { kind: 'tomorrow' }, hoursRead: span }
}
