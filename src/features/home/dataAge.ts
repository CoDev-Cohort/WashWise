const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * How long ago a forecast was received, for the "Updated X ago" banner (4.2 FR-005): "just now" under
 * a minute (and for a clock that runs behind), then whole minutes, hours or days, rounded down.
 */
export function formatDataAge(fetchedAt: number, now: number): string {
  const age = now - fetchedAt
  if (age < MINUTE) return 'just now'
  if (age < HOUR) return `${Math.floor(age / MINUTE)} min ago`
  if (age < DAY) return `${Math.floor(age / HOUR)} h ago`
  const days = Math.floor(age / DAY)
  return `${days} ${days === 1 ? 'day' : 'days'} ago`
}
