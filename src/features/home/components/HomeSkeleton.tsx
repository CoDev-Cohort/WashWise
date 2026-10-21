const BLOCK = 'animate-pulse rounded-xl bg-surface-muted motion-reduce:animate-none'

/** Placeholders for the day strip, cards and chart while the first forecast loads (FR-013). */
export function HomeSkeleton() {
  return (
    <div role="status" aria-label="Loading forecast" className="flex flex-col gap-6">
      <div className={`h-20 ${BLOCK}`} />
      <div className="flex flex-col gap-card-gap">
        <div className={`h-40 ${BLOCK}`} />
        <div className={`h-40 ${BLOCK}`} />
      </div>
      <div className={`h-40 ${BLOCK}`} />
    </div>
  )
}
