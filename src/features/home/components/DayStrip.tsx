import { WeatherIcon } from '@/components/icons/WeatherIcon'
import type { StripDay } from '../types'

interface DayStripProps {
  days: StripDay[]
  selected: number
  onSelect: (index: number) => void
}

/**
 * Six selectable days. Each is a real button; the selected one carries `aria-pressed`, so every day
 * is a Tab stop and Enter/Space select it (FR-004).
 */
export function DayStrip({ days, selected, onSelect }: DayStripProps) {
  return (
    <div
      data-section="strip"
      role="group"
      aria-label="Choose a day"
      className="grid grid-cols-6 gap-chip-gap"
    >
      {days.map((day) => {
        const active = day.index === selected
        return (
          <button
            key={day.date}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(day.index)}
            className={`flex min-w-0 flex-col items-center gap-1 rounded-lg border px-1 py-2 focus-ring ${
              active ? 'border-ink bg-ink text-on-ink' : 'border-border bg-surface text-ink-strong'
            }`}
          >
            {/* The visible text is the accessible name ("Today, 21"), so voice control can say it. */}
            <span className="font-day text-day uppercase">{day.isToday ? 'Today' : day.label}</span>
            <span className="font-date text-date">
              <span className="sr-only">, </span>
              {day.dateLabel}
            </span>
            <WeatherIcon code={day.weatherCode} isDay decorative size={24} />
          </button>
        )
      })}
    </div>
  )
}
