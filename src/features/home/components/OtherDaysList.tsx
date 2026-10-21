import { WeatherIcon } from '@/components/icons/WeatherIcon'
import type { OtherDayRow } from '../types'
import { OtherDayMarker } from './OtherDayMarker'

interface OtherDaysListProps {
  rows: OtherDayRow[]
}

/** The days after Today, each with a marker for laundry and for car wash (FR-007). */
export function OtherDaysList({ rows }: OtherDaysListProps) {
  if (rows.length === 0) return null
  return (
    <section
      data-section="otherDays"
      aria-labelledby="other-days-title"
      className="flex flex-col gap-3"
    >
      <h2 id="other-days-title" className="font-section text-section text-ink-section uppercase">
        Other days
      </h2>
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <li
            key={row.date}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2"
          >
            <span className="flex items-center gap-2 text-ink-strong">
              <WeatherIcon code={row.weatherCode} isDay decorative size={24} />
              <span className="font-day text-day">{row.label}</span>
              <span className="font-date text-date">{row.dateLabel}</span>
            </span>
            <span className="flex flex-col items-end gap-1">
              <OtherDayMarker activity="Laundry" label={row.laundry} />
              <OtherDayMarker activity="Car wash" label={row.carWash} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
