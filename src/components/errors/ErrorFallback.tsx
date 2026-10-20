import { RotateCcw } from 'lucide-react'

interface ErrorFallbackProps {
  /** Re-renders the failed part of the app. Hidden when not provided. */
  onRetry?: () => void
  onReload?: () => void
}

/** Friendly screen shown instead of a blank page when something unexpected breaks (FR-010). */
export function ErrorFallback({
  onRetry,
  onReload = () => window.location.reload(),
}: ErrorFallbackProps) {
  return (
    <div
      role="alert"
      className="px-gutter mx-auto flex min-h-dvh max-w-[430px] flex-col items-center justify-center gap-4 text-center"
    >
      <h1 className="font-title text-title text-ink">Something went wrong</h1>
      <p className="font-body text-body text-ink-muted">
        WashWise hit an unexpected problem. Your settings are safe. Try again, or reload the page.
      </p>
      <div className="flex gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="bg-ink font-status text-status text-on-ink inline-flex items-center gap-2 rounded-lg px-4 py-2"
          >
            <RotateCcw aria-hidden="true" size={16} />
            Try again
          </button>
        )}
        <button
          type="button"
          onClick={onReload}
          className="border-border font-status text-status text-ink rounded-lg border px-4 py-2"
        >
          Reload
        </button>
      </div>
    </div>
  )
}
