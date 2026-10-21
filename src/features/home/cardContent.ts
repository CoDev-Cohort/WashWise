import type { EpochMs, Forecast } from '@/features/forecast/types'
import { getWeatherIcon } from '@/features/icons/getWeatherIcon'
import {
  computeCarWashVerdict,
  computeDayVerdicts,
  computeLaundryVerdict,
  type Activity,
  type VerdictResult,
} from '@/features/verdict'
import type { CardPill } from './types'

export interface CardContent {
  activity: Activity
  result: VerdictResult
  pills: CardPill[]
}

/** "Dries in ~2.5 hrs": the estimate rounded to the nearest half hour, at least half an hour. */
export function formatDryingHours(hours: number): string {
  const rounded = Math.max(0.5, Math.round(hours * 2) / 2)
  return `Dries in ~${rounded} ${rounded === 1 ? 'hr' : 'hrs'}`
}

/** The forecast hour that contains `now`, or `undefined` when `now` is outside the forecast. */
function currentHour(forecast: Forecast, now: EpochMs) {
  let found: Forecast['hourly'][number] | undefined
  for (const hour of forecast.hourly) {
    if (hour.time > now) break
    found = hour
  }
  return found
}

function conditionPill(code: number | null, isDay: boolean | null): CardPill {
  return {
    kind: 'condition',
    text: getWeatherIcon(code, isDay).label,
    weatherCode: code,
    isDay,
  }
}

function pillsFor(result: VerdictResult, condition: CardPill): CardPill[] {
  if (result.status !== 'ok') return []
  const pills: CardPill[] = []
  if (result.drying) {
    pills.push({
      kind: 'drying',
      text:
        result.drying.kind === 'hours' ? formatDryingHours(result.drying.hours) : 'Dries tomorrow',
    })
  }
  pills.push(condition)
  return pills
}

/**
 * What the two cards show for the selected day. Today uses the "from now" verdicts, which can move
 * to tomorrow late in the day; other days use the same day-anchored verdicts as Other Days (FR-001).
 * The drying pill comes from the verdict result; the condition pill from the forecast's weather code.
 */
export function getCardContent(
  forecast: Forecast,
  dayIndex: number,
  now: EpochMs,
): { laundry: CardContent; carWash: CardContent } {
  let laundry: VerdictResult
  let carWash: VerdictResult
  let condition: CardPill

  if (dayIndex === 0) {
    laundry = computeLaundryVerdict(forecast, now)
    carWash = computeCarWashVerdict(forecast, now)
    const hour = currentHour(forecast, now)
    condition = conditionPill(
      hour?.weatherCode ?? forecast.daily[0]?.weatherCode ?? null,
      hour?.isDay ?? true,
    )
  } else {
    const day = computeDayVerdicts(forecast)[dayIndex]
    laundry = day?.laundry ?? { status: 'unavailable', activity: 'laundry', reason: 'missingData' }
    carWash = day?.carWash ?? { status: 'unavailable', activity: 'carWash', reason: 'missingData' }
    condition = conditionPill(forecast.daily[dayIndex]?.weatherCode ?? null, true)
  }

  return {
    laundry: { activity: 'laundry', result: laundry, pills: pillsFor(laundry, condition) },
    carWash: { activity: 'carWash', result: carWash, pills: pillsFor(carWash, condition) },
  }
}
