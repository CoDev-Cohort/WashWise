import type { Forecast } from '@/features/forecast/types'
import { computeCarWashForDay } from './carWash'
import { VERDICT_CONFIG, type VerdictConfig } from './config'
import { computeLaundryForDay } from './laundry'
import type { DayVerdicts } from './types'

/** Laundry and car-wash verdicts for every forecast day, each anchored to that day (FR-004f). */
export function computeDayVerdicts(
  forecast: Forecast,
  cfg: VerdictConfig = VERDICT_CONFIG,
): DayVerdicts[] {
  return forecast.daily.map((day, i) => ({
    date: day.date,
    laundry: computeLaundryForDay(forecast, i, cfg),
    carWash: computeCarWashForDay(forecast, i, cfg),
  }))
}
