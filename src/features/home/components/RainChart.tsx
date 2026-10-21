import type { RainBar } from '../types'

/** Rain scale token by chance, low → high (DESIGN.md: rain-1 … rain-5). */
function barColor(percent: number): string {
  if (percent < 20) return 'bg-rain-1'
  if (percent < 40) return 'bg-rain-2'
  if (percent < 60) return 'bg-rain-3'
  if (percent < 80) return 'bg-rain-4'
  return 'bg-rain-5'
}

interface RainChartProps {
  bars: RainBar[]
}

/** Hourly rain-chance bars with a text alternative that lists every hour (FR-005, FR-006). */
export function RainChart({ bars }: RainChartProps) {
  return (
    <section aria-labelledby="rain-chart-title" className="flex flex-col gap-3">
      <h2 id="rain-chart-title" className="font-section text-section text-ink-section uppercase">
        Rain chance
      </h2>
      {bars.length === 0 ? (
        <p className="font-body text-body text-ink-muted">No hourly forecast for this day.</p>
      ) : (
        <>
          <ul
            aria-hidden="true"
            className="grid items-end gap-2"
            style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}
          >
            {bars.map((bar) => (
              <li key={bar.time} className="flex flex-col items-center gap-1">
                <span className="font-metric text-metric text-ink-strong">
                  {bar.percent === null ? '—' : `${Math.round(bar.percent)}%`}
                </span>
                <span className="flex h-24 w-full items-end rounded-md bg-surface-muted">
                  {bar.percent !== null && (
                    <span
                      className={`w-full rounded-md ${barColor(bar.percent)}`}
                      style={{ height: `${Math.max(4, Math.min(100, bar.percent))}%` }}
                    />
                  )}
                </span>
                <span className="font-body text-body text-ink-muted">{bar.hourLabel}</span>
                <span className="h-3 font-caption text-caption text-ink-muted">
                  {bar.isNextDay ? 'Tmrw' : ''}
                </span>
              </li>
            ))}
          </ul>
          <ul className="sr-only">
            {bars.map((bar) => (
              <li key={bar.time}>
                {bar.hourLabel}
                {bar.isNextDay ? ' tomorrow' : ''}:{' '}
                {bar.percent === null
                  ? 'rain chance unavailable'
                  : `${Math.round(bar.percent)}% chance of rain`}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
