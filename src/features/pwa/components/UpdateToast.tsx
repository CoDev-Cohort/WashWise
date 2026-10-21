import { RefreshCw } from 'lucide-react'
import { PROMPT_BUTTON, PROMPT_CARD, PROMPT_PRIMARY, PROMPT_SECONDARY } from './promptStyles'

interface UpdateToastProps {
  onReload: () => void
  onDismiss: () => void
}

/** "A new version is available" with Reload and Dismiss (4.2 FR-008, FR-013). */
export function UpdateToast({ onReload, onDismiss }: UpdateToastProps) {
  return (
    <div className={PROMPT_CARD}>
      <RefreshCw aria-hidden="true" size={20} className="shrink-0" />
      <p role="status" className="min-w-0 flex-1 font-status text-status">
        A new version is available
      </p>
      <button type="button" onClick={onDismiss} className={`${PROMPT_BUTTON} ${PROMPT_SECONDARY}`}>
        Dismiss
      </button>
      <button type="button" onClick={onReload} className={`${PROMPT_BUTTON} ${PROMPT_PRIMARY}`}>
        Reload
      </button>
    </div>
  )
}
