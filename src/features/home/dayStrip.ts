import type { Forecast } from '@/features/forecast/types'
import type { StripDay } from './types'

export const STRIP_DAYS = 6

const WEEKDAY = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' })

/**
 * "2026-10-21" → a calendar date with no time zone attached. `DailyPoint.date` is already the day in
 * the location's own time zone, so reading it as UTC gives the right weekday on any device.
 */
function parseCalendarDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1))
}

export function weekdayLabel(date: string): string {
  return WEEKDAY.format(parseCalendarDate(date)).toUpperCase()
}

export function dateLabel(date: string): string {
  return String(parseCalendarDate(date).getUTCDate())
}

/**
 * The days shown in the strip: Today first, then weekday and date for each following day, in the
 * location's time zone (FR-003). Fewer days when the forecast is shorter.
 */
export function buildDayStrip(forecast: Forecast, count = STRIP_DAYS): StripDay[] {
  return forecast.daily.slice(0, count).map((day, index) => ({
    index,
    date: day.date,
    isToday: index === 0,
    label: index === 0 ? 'Today' : weekdayLabel(day.date),
    dateLabel: dateLabel(day.date),
    weatherCode: day.weatherCode,
  }))
}
