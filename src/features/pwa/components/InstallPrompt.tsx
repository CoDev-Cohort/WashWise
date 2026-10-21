import { Download } from 'lucide-react'
import { PROMPT_BUTTON, PROMPT_CARD, PROMPT_PRIMARY, PROMPT_SECONDARY } from './promptStyles'

interface InstallPromptProps {
  onInstall: () => void
  onDismiss: () => void
}

/** "Install WashWise" with Install and Not now (4.2 FR-010, FR-013). */
export function InstallPrompt({ onInstall, onDismiss }: InstallPromptProps) {
  return (
    <section aria-label="Install WashWise" className={PROMPT_CARD}>
      <Download aria-hidden="true" size={20} className="shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="font-status text-status">Install WashWise</p>
        <p className="font-caption text-caption">Open it from your home screen, even offline.</p>
      </div>
      <button type="button" onClick={onDismiss} className={`${PROMPT_BUTTON} ${PROMPT_SECONDARY}`}>
        Not now
      </button>
      <button type="button" onClick={onInstall} className={`${PROMPT_BUTTON} ${PROMPT_PRIMARY}`}>
        Install
      </button>
    </section>
  )
}
