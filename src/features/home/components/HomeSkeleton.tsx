import { DayStripSkeleton } from './DayStripSkeleton'
import { OtherDaysSkeleton } from './OtherDaysSkeleton'
import { RainChartSkeleton } from './RainChartSkeleton'
import { VerdictCardSkeleton } from './VerdictCardSkeleton'

/**
 * Every section's placeholder, in page order, while the first forecast loads (spec FR-001 – FR-003).
 * One status for the whole page; the placeholders themselves are hidden from assistive technology.
 */
export function HomeSkeleton() {
  return (
    <div role="status" aria-label="Loading forecast" className="flex flex-col gap-6">
      <DayStripSkeleton />
      <div className="flex flex-col gap-card-gap">
        <VerdictCardSkeleton activity="laundry" />
        <VerdictCardSkeleton activity="carWash" />
      </div>
      <RainChartSkeleton />
      <OtherDaysSkeleton />
    </div>
  )
}
