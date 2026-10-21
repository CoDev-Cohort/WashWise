import { BONE } from './skeleton'

/** The Other Days frame: real heading and five rows (the strip's 6 days minus Today). */
export function OtherDaysSkeleton() {
  return (
    <div data-section="otherDays" aria-hidden="true" className="flex flex-col gap-3">
      <span className="font-section text-section text-ink-section uppercase">Other days</span>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2"
          >
            <span className="flex items-center gap-2">
              <span className={`size-6 rounded-full ${BONE}`} />
              <span className={`w-8 font-day text-day ${BONE}`}>&nbsp;</span>
              <span className={`w-6 font-date text-date ${BONE}`}>&nbsp;</span>
            </span>
            <span className="flex flex-col items-end gap-1">
              {[0, 1].map((row) => (
                <span key={row} className="flex items-center gap-1">
                  <span className={`w-14 font-eyebrow text-eyebrow ${BONE}`}>&nbsp;</span>
                  <span className="inline-flex items-center gap-1 font-status text-status">
                    <span className="size-3.5" />
                    <span className={`w-8 ${BONE}`}>&nbsp;</span>
                  </span>
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
