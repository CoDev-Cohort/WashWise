import { BONE } from './skeleton'

/** The day strip's frame with placeholder cells: same grid, borders, padding and type as `DayStrip`. */
export function DayStripSkeleton() {
  return (
    <div data-section="strip" aria-hidden="true" className="grid grid-cols-6 gap-chip-gap">
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className="flex min-w-0 flex-col items-center gap-1 rounded-lg border border-border bg-surface px-1 py-2"
        >
          <span className={`w-8 font-day text-day ${BONE}`}>&nbsp;</span>
          <span className={`w-6 font-date text-date ${BONE}`}>&nbsp;</span>
          <span className={`size-6 rounded-full ${BONE}`} />
        </div>
      ))}
    </div>
  )
}
