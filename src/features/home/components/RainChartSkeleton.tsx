import { BONE } from './skeleton'

/** The rain chart's frame: real heading, five empty bars with their percentage and hour lines. */
export function RainChartSkeleton() {
  return (
    <div data-section="rain" aria-hidden="true" className="flex flex-col gap-3">
      <span className="font-section text-section text-ink-section uppercase">Rain chance</span>
      <div className="grid grid-cols-5 items-end gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span className={`w-8 font-metric text-metric ${BONE}`}>&nbsp;</span>
            <span className={`h-24 w-full rounded-md ${BONE}`} />
            <span className={`w-10 font-body text-body ${BONE}`}>&nbsp;</span>
            <span className="h-3" />
          </div>
        ))}
      </div>
    </div>
  )
}
