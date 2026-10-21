import type { Forecast } from '@/features/forecast/types'
import { computeDayVerdicts, toOtherDaysLabel } from '@/features/verdict'
import { buildDayStrip } from './dayStrip'
import type { OtherDayRow } from './types'

/**
 * The Other Days rows: the strip's days after Today, each with the Yes / Maybe / Wait / — marker for
 * laundry and for car wash (FR-007). Today never appears: its verdict is on the cards.
 */
export function buildOtherDays(forecast: Forecast): OtherDayRow[] {
  const verdicts = computeDayVerdicts(forecast)
  return buildDayStrip(forecast)
    .filter((day) => !day.isToday)
    .map((day) => {
      const verdict = verdicts[day.index]
      return {
        index: day.index,
        date: day.date,
        label: day.label,
        dateLabel: day.dateLabel,
        weatherCode: day.weatherCode,
        laundry: verdict ? toOtherDaysLabel(verdict.laundry) : '—',
        carWash: verdict ? toOtherDaysLabel(verdict.carWash) : '—',
      }
    })
}
