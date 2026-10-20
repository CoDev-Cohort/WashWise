import type { HourlyPoint } from '@/features/forecast/types'
import { VERDICT_CONFIG, type VerdictConfig } from './config'

/**
 * FR-004c: true when more than the allowed share of `hours` is missing a required value.
 * No hours at all also counts as too much missing data.
 */
export function exceedsMissingRatio(
  hours: HourlyPoint[],
  isMissing: (hour: HourlyPoint) => boolean,
  cfg: VerdictConfig = VERDICT_CONFIG,
): boolean {
  if (hours.length === 0) return true
  const missing = hours.filter(isMissing).length
  return missing / hours.length > cfg.missingData.maxMissingRatio
}
