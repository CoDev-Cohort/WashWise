import type { EpochMs, Forecast } from '@/features/forecast/types'
import { VERDICT_CONFIG, type VerdictConfig } from './config'
import { HOUR, hoursInRange, hourStartAt } from './daylight'
import { CAR_WASH_LABELS } from './labels'
import { exceedsMissingRatio } from './missing'
import type { Verdict, VerdictReason, VerdictResult } from './types'

export interface CarWashRuleResult {
  verdict: Verdict
  subLabel: string
  reasons: VerdictReason[]
}

/** Rain sums are reported to 0.1 mm; round so 0.1 + 0.4 compares as exactly 0.5. */
const roundMm = (mm: number) => Math.round(mm * 100) / 100

/** FR-004b car-wash thresholds, given the worst-hour rain chance and the rain in each 24 h half. */
export function carWashRules(
  rainMaxPct: number,
  day1Mm: number,
  day2Mm: number,
  cfg: VerdictConfig = VERDICT_CONFIG,
): CarWashRuleResult {
  const { goBelowPct, notYetAbovePct } = cfg.rain
  const { goMaxTotalMm, notYetDay1Mm, cautionMinMm } = cfg.carWash

  if (rainMaxPct > notYetAbovePct || day1Mm >= notYetDay1Mm) {
    const reasons: VerdictReason[] = []
    if (rainMaxPct > notYetAbovePct) reasons.push('rainHigh')
    if (day1Mm >= notYetDay1Mm) reasons.push('heavyRainDay1')
    return { verdict: 'notYet', subLabel: CAR_WASH_LABELS.notYet, reasons }
  }
  if (rainMaxPct < goBelowPct && roundMm(day1Mm + day2Mm) < goMaxTotalMm) {
    return { verdict: 'go', subLabel: CAR_WASH_LABELS.go, reasons: [] }
  }
  if (day1Mm >= cautionMinMm) {
    return { verdict: 'caution', subLabel: CAR_WASH_LABELS.cautionToday, reasons: ['rainDay1'] }
  }
  const reasons: VerdictReason[] = []
  if (rainMaxPct >= goBelowPct) reasons.push('rainModerate')
  if (day2Mm >= cautionMinMm) reasons.push('rainDay2')
  return { verdict: 'caution', subLabel: CAR_WASH_LABELS.cautionTomorrow, reasons }
}

function assessWindow(forecast: Forecast, from: EpochMs, cfg: VerdictConfig): VerdictResult {
  const start = hourStartAt(forecast.hourly, from)
  const end = start + cfg.carWash.windowHours * HOUR
  // Hours past the end of the forecast simply don't exist, so they never count as missing (FR-004f).
  const hours = hoursInRange(forecast.hourly, start, end)
  const isMissing = (h: (typeof hours)[number]) =>
    h.precipProbability === null || h.precipitation === null
  if (exceedsMissingRatio(hours, isMissing, cfg)) {
    return { status: 'unavailable', activity: 'carWash', reason: 'missingData' }
  }

  const half = start + 24 * HOUR
  let rainMax = 0
  let day1 = 0
  let day2 = 0
  for (const h of hours) {
    if (h.precipProbability !== null) rainMax = Math.max(rainMax, h.precipProbability)
    if (h.precipitation === null) continue
    if (h.time < half) day1 += h.precipitation
    else day2 += h.precipitation
  }
  const rule = carWashRules(rainMax, roundMm(day1), roundMm(day2), cfg)
  const lastHourEnd = hours.at(-1)!.time + HOUR

  return {
    status: 'ok',
    activity: 'carWash',
    verdict: rule.verdict,
    subLabel: rule.subLabel,
    reasons: rule.reasons,
    window: { start, end: Math.min(end, lastHourEnd) },
    forTomorrow: false,
  }
}

/** Car-wash verdict for the next 48 h from the current hour (FR-002). */
export function computeCarWashVerdict(
  forecast: Forecast,
  now: EpochMs,
  cfg: VerdictConfig = VERDICT_CONFIG,
): VerdictResult {
  return assessWindow(forecast, now, cfg)
}

/** Car-wash verdict for a forecast day: 48 h from that day's sunrise (FR-004f). */
export function computeCarWashForDay(
  forecast: Forecast,
  index: number,
  cfg: VerdictConfig = VERDICT_CONFIG,
): VerdictResult {
  const day = forecast.daily[index]!
  return assessWindow(forecast, day.sunrise ?? day.start, cfg)
}
