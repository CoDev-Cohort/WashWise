import { RotateCcw } from 'lucide-react'

interface HomeErrorProps {
  onRetry: () => void
}

/** Shown when the first forecast cannot be loaded. The header stays usable above it (FR-013). */
export function HomeError({ onRetry }: HomeErrorProps) {
  return (
    <div role="alert" className="flex flex-col items-center gap-4 py-10 text-center">
      <h2 className="font-title text-title text-ink">We couldn’t load the forecast</h2>
      <p className="font-body text-body text-ink-muted">
        Check your connection and try again. Your location is still saved.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 font-status text-status text-on-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <RotateCcw aria-hidden="true" size={16} />
        Try again
      </button>
    </div>
  )
}
