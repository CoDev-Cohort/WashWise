import { LoaderCircle, MapPin } from 'lucide-react'

interface LocationPillProps {
  place: string
  refreshing: boolean
  onRefresh: () => void
}

/** The current place. Pressing it asks for the location again and refreshes the forecast (FR-009). */
export function LocationPill({ place, refreshing, onRefresh }: LocationPillProps) {
  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={refreshing}
      aria-label={`Update location, ${place}`}
      aria-busy={refreshing}
      className="inline-flex min-h-8 max-w-full items-center gap-1 rounded-sm bg-surface-muted px-2 font-location text-location text-ink-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {refreshing ? (
        <LoaderCircle
          data-testid="pill-spinner"
          aria-hidden="true"
          size={12}
          className="shrink-0 animate-spin text-accent motion-reduce:animate-none"
        />
      ) : (
        <MapPin aria-hidden="true" size={12} className="shrink-0" />
      )}
      <span className="truncate">{place}</span>
    </button>
  )
}
