import { useState, useSyncExternalStore } from 'react'
import {
  canPromptInstall,
  isStandalone,
  promptInstall,
  subscribeInstallPrompt,
} from './installPrompt'
import { dismissInstall, getVisits, isInstallDismissed } from './installStorage'

/** The prompt waits for a returning user: never on the first visit (4.2 clarification). */
export const INSTALL_PROMPT_MIN_VISITS = 2

export interface InstallPromptState {
  canShow: boolean
  install: () => void
  dismiss: () => void
}

/**
 * Whether to offer "Install WashWise" (4.2 FR-010, FR-011): the browser offers installation, the app
 * isn't running installed, this is at least the second visit, and the user hasn't said "Not now".
 */
export function useInstallPrompt(): InstallPromptState {
  const available = useSyncExternalStore(subscribeInstallPrompt, canPromptInstall, () => false)
  const [dismissed, setDismissed] = useState(isInstallDismissed)
  return {
    canShow: available && !dismissed && !isStandalone() && getVisits() >= INSTALL_PROMPT_MIN_VISITS,
    install: () => void promptInstall(),
    dismiss: () => {
      dismissInstall()
      setDismissed(true)
    },
  }
}
