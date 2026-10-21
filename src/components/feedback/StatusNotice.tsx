import { CircleAlert, RotateCcw } from 'lucide-react'

interface StatusNoticeProps {
  label: string
  hint?: string
  onRetry: () => void
  /** A retry is running: the button is disabled and says so. */
  retrying?: boolean
  /**
   * `block` replaces the page content and is announced at once (`alert`).
   * `banner` sits above content that is still shown and is announced politely (`status`).
   */
  variant: 'block' | 'banner'
}

const BUTTON =
  'inline-flex shrink-0 items-center gap-2 rounded-lg font-status text-status focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60'

/** The one error pattern: one icon, one label, an optional hint and "Try again" (spec FR-004). */
export function StatusNotice({
  label,
  hint,
  onRetry,
  retrying = false,
  variant,
}: StatusNoticeProps) {
  const button = (
    <button
      type="button"
      onClick={onRetry}
      disabled={retrying}
      className={`${BUTTON} ${
        variant === 'block'
          ? 'bg-ink px-4 py-2 text-on-ink'
          : 'border border-border px-3 py-2 text-ink'
      }`}
    >
      <RotateCcw
        aria-hidden="true"
        size={16}
        className={retrying ? 'motion-safe:animate-spin' : ''}
      />
      {retrying ? 'Retrying…' : 'Try again'}
    </button>
  )

  if (variant === 'banner') {
    return (
      <div
        role="status"
        className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2"
      >
        <CircleAlert aria-hidden="true" size={20} className="shrink-0 text-ink-muted" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="font-status text-status text-ink">{label}</p>
          {hint && <p className="font-caption text-caption text-ink-muted">{hint}</p>}
        </div>
        {button}
      </div>
    )
  }

  return (
    <div role="alert" className="flex flex-col items-center gap-4 py-10 text-center">
      <CircleAlert aria-hidden="true" size={40} className="text-ink-muted" />
      <h2 className="font-title text-title text-ink">{label}</h2>
      {hint && (
        <p className="max-w-[28ch] font-body text-body text-balance text-ink-muted">{hint}</p>
      )}
      {button}
    </div>
  )
}
