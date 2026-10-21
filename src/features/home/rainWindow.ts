import type { EpochMs, Forecast, HourlyPoint } from '@/features/forecast/types'
import type { RainBar } from './types'

const HOUR = 3_600_000

/** Display windows of the chart. These are layout choices, not verdict thresholds. */
export const RAIN_CHART = {
  /** Today: this many hours, starting with the current one. */
  todayHours: 5,
  /** Other days: from this local hour (12 PM) … */
  futureStartHour: 12,
  /** … up to and including this one (4 PM). */
  futureEndHour: 16,
} as const

/** Hour of day (0–23) on the location's wall clock. Open-Meteo applies one UTC offset to the response. */
function localHour(forecast: Forecast, time: EpochMs): number {
  return new Date(time + forecast.utcOffsetSeconds * 1000).getUTCHours()
}

/** "12 AM", "3 PM". */
export function formatHour(hour: number): string {
  const suffix = hour < 12 ? 'AM' : 'PM'
  return `${hour % 12 === 0 ? 12 : hour % 12} ${suffix}`
}

function toBar(forecast: Forecast, point: HourlyPoint, dayEnd: EpochMs): RainBar {
  return {
    time: point.time,
    hourLabel: formatHour(localHour(forecast, point.time)),
    percent: point.precipProbability,
    isNextDay: point.time >= dayEnd,
  }
}

/**
 * The bars for the selected day (FR-005). Today: the current hour and the four after it, continuing
 * into the next day late at night so there are always five while the forecast lasts. Other days:
 * 12 PM to 4 PM. A missing value stays `null`, never 0%.
 */
export function getRainBars(forecast: Forecast, dayIndex: number, now: EpochMs): RainBar[] {
  const day = forecast.daily[dayIndex]
  if (!day) return []
  const dayEnd = forecast.daily[dayIndex + 1]?.start ?? day.start + 24 * HOUR

  if (dayIndex === 0) {
    // The hour that contains `now`; before the forecast starts, begin at its first hour.
    let start = 0
    forecast.hourly.forEach((point, i) => {
      if (point.time <= now) start = i
    })
    return forecast.hourly
      .slice(start, start + RAIN_CHART.todayHours)
      .map((point) => toBar(forecast, point, dayEnd))
  }

  return forecast.hourly
    .filter((point) => {
      if (point.time < day.start || point.time >= dayEnd) return false
      const hour = localHour(forecast, point.time)
      return hour >= RAIN_CHART.futureStartHour && hour <= RAIN_CHART.futureEndHour
    })
    .map((point) => toBar(forecast, point, dayEnd))
}
