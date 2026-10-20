import type { EpochMs, Forecast, HourlyPoint } from '@/features/forecast/types'
import { VERDICT_CONFIG, type VerdictConfig } from './config'
import {
  darkness,
  dayEnd,
  dayIndexForTime,
  getUsableDaylight,
  HOUR,
  hoursInRange,
  hourStartAt,
} from './daylight'
import { estimateDrying, hasDryingInputs } from './drying'
import { LAUNDRY_LABELS, worst } from './labels'
import { exceedsMissingRatio } from './missing'
import type { DryingEstimate, Verdict, VerdictReason, VerdictResult } from './types'

const unavailable: VerdictResult = {
  status: 'unavailable',
  activity: 'laundry',
  reason: 'missingData',
}

export interface LaundryRuleResult {
  verdict: Verdict
  reasons: VerdictReason[]
  /** Which label to show for Caution: rain wins when both apply. */
  cautionCause?: 'rain' | 'drying'
}

/** FR-004b laundry thresholds, given the worst-hour rain chance and the drying estimate. */
export function laundryRules(
  rainMaxPct: number,
  drying: DryingEstimate,
  cfg: VerdictConfig = VERDICT_CONFIG,
): LaundryRuleResult {
  const { goBelowPct, notYetAbovePct } = cfg.rain
  const { dryingGoMaxHours, dryingCautionMaxHours } = cfg.laundry
  const reasons: VerdictReason[] = []

  const rain: Verdict =
    rainMaxPct < goBelowPct ? 'go' : rainMaxPct <= notYetAbovePct ? 'caution' : 'notYet'
  if (rain === 'caution') reasons.push('rainModerate')
  if (rain === 'notYet') reasons.push('rainHigh')

  let dry: Verdict
  if (drying.kind === 'tomorrow') {
    dry = 'notYet'
    reasons.push('wontDryBeforeDark')
  } else if (drying.hours <= dryingGoMaxHours) {
    dry = 'go'
  } else if (drying.hours <= dryingCautionMaxHours) {
    dry = 'caution'
    reasons.push('dryingSlow')
  } else {
    dry = 'notYet'
    reasons.push('dryingTooSlow')
  }

  const verdict = worst(rain, dry)
  const cautionCause = verdict === 'caution' ? (rain === 'caution' ? 'rain' : 'drying') : undefined
  return { verdict, reasons, cautionCause }
}

function subLabel(rule: LaundryRuleResult, forTomorrow: boolean): string {
  const labels = forTomorrow ? LAUNDRY_LABELS.tomorrow : LAUNDRY_LABELS.today
  if (rule.verdict === 'go') return labels.go
  if (rule.verdict === 'notYet') return labels.notYet
  return rule.cautionCause === 'rain' ? labels.cautionRain : labels.cautionDrying
}

/** Assesses one day's laundry window, starting at `now` (today) or at usable sunrise (other days). */
function assessDay(
  forecast: Forecast,
  index: number,
  now: EpochMs | null,
  forTomorrow: boolean,
  cfg: VerdictConfig,
): VerdictResult {
  const usable = getUsableDaylight(forecast, index, cfg)
  if (!usable) {
    // FR-004d: the sun doesn't rise on the assessed day.
    return {
      status: 'ok',
      activity: 'laundry',
      verdict: 'notYet',
      subLabel: forTomorrow ? LAUNDRY_LABELS.tomorrow.notYet : LAUNDRY_LABELS.today.notYet,
      reasons: ['noDaylight'],
      window: { start: forecast.daily[index]!.start, end: dayEnd(forecast, index) },
      forTomorrow,
    }
  }

  const from = now === null ? usable.start : Math.max(now, usable.start)
  const start = hourStartAt(forecast.hourly, from)
  const end = Math.min(start + cfg.laundry.windowHours * HOUR, usable.end)
  const windowHours = hoursInRange(forecast.hourly, start, end)
  const { estimate, hoursRead } = estimateDrying(
    forecast.hourly,
    from,
    darkness(forecast, index, cfg),
    cfg,
  )

  // FR-004c: the window needs rain chances; the drying span needs drying inputs.
  const read = new Map<EpochMs, HourlyPoint>()
  for (const h of [...windowHours, ...hoursRead]) read.set(h.time, h)
  const windowTimes = new Set(windowHours.map((h) => h.time))
  const dryingTimes = new Set(hoursRead.map((h) => h.time))
  const isMissing = (h: HourlyPoint) =>
    (windowTimes.has(h.time) && h.precipProbability === null) ||
    (dryingTimes.has(h.time) && !hasDryingInputs(h))
  if (exceedsMissingRatio([...read.values()], isMissing, cfg)) return unavailable

  const chances = windowHours.flatMap((h) =>
    h.precipProbability === null ? [] : [h.precipProbability],
  )
  if (chances.length === 0) return unavailable
  const rule = laundryRules(Math.max(...chances), estimate, cfg)

  return {
    status: 'ok',
    activity: 'laundry',
    verdict: rule.verdict,
    subLabel: subLabel(rule, forTomorrow),
    reasons: rule.reasons,
    window: { start, end },
    forTomorrow,
    drying: estimate,
  }
}

/**
 * Today's laundry verdict (FR-001). With less than 2 h of usable daylight left, it assesses
 * tomorrow's first 6 usable-daylight hours instead and says so in the sub-label.
 */
export function computeLaundryVerdict(
  forecast: Forecast,
  now: EpochMs,
  cfg: VerdictConfig = VERDICT_CONFIG,
): VerdictResult {
  const today = dayIndexForTime(forecast, now)
  if (today === -1) return unavailable

  const usable = getUsableDaylight(forecast, today, cfg)
  const remaining = usable ? usable.end - Math.max(now, usable.start) : 0
  if (remaining >= cfg.laundry.switchToTomorrowBelowHours * HOUR) {
    return assessDay(forecast, today, now, false, cfg)
  }
  if (today + 1 >= forecast.daily.length) return unavailable
  return assessDay(forecast, today + 1, null, true, cfg)
}

/** Laundry verdict for a whole forecast day, from its usable sunrise (FR-004f). */
export function computeLaundryForDay(
  forecast: Forecast,
  index: number,
  cfg: VerdictConfig = VERDICT_CONFIG,
): VerdictResult {
  return assessDay(forecast, index, null, false, cfg)
}
