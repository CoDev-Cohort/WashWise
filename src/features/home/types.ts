import type { EpochMs } from '@/features/forecast/types'
import type { OtherDaysLabel } from '@/features/verdict'

/** One day button in the strip. `index` points into `Forecast.daily`. */
export interface StripDay {
  index: number
  date: string
  isToday: boolean
  /** "Today", or the weekday in capitals ("WED"). */
  label: string
  /** Day of the month, "21". */
  dateLabel: string
  weatherCode: number | null
}

/** One bar of the rain chart. `percent` is `null` when the forecast has no value for that hour. */
export interface RainBar {
  time: EpochMs
  /** "3 PM". */
  hourLabel: string
  percent: number | null
  /** The hour falls on the day after the selected one (Today's chart late at night). */
  isNextDay: boolean
}

export interface CardPill {
  kind: 'drying' | 'condition'
  text: string
  /** Weather condition pills show an icon for this code. */
  weatherCode?: number | null
  isDay?: boolean | null
}

export interface OtherDayRow {
  index: number
  date: string
  label: string
  dateLabel: string
  weatherCode: number | null
  laundry: OtherDaysLabel
  carWash: OtherDaysLabel
}
