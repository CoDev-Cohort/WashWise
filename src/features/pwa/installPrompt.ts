/** Chromium's install event. Not in the DOM typings. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable'

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((listener) => listener())

/**
 * Keeps the browser's install offer for the in-app prompt (4.2 FR-010). Call before React renders:
 * the event can fire before the app mounts. Holding it back also stops Chrome's own install bar, so
 * there is one prompt, ours. Returns a function that stops listening.
 */
export function listenForInstallPrompt(): () => void {
  const onPrompt = (event: Event) => {
    event.preventDefault()
    deferred = event as BeforeInstallPromptEvent
    emit()
  }
  const onInstalled = () => {
    deferred = null
    emit()
  }
  window.addEventListener('beforeinstallprompt', onPrompt)
  window.addEventListener('appinstalled', onInstalled)
  return () => {
    window.removeEventListener('beforeinstallprompt', onPrompt)
    window.removeEventListener('appinstalled', onInstalled)
    deferred = null
  }
}

export function subscribeInstallPrompt(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Whether the browser currently offers installation. */
export const canPromptInstall = (): boolean => deferred !== null

/** Opens the browser's install dialog. The offer can be used once, so it is cleared either way. */
export async function promptInstall(): Promise<InstallOutcome> {
  const event = deferred
  if (!event) return 'unavailable'
  deferred = null
  emit()
  await event.prompt()
  const { outcome } = await event.userChoice
  return outcome
}

/** Running as an installed app (Android/desktop standalone window, or the iOS home screen). */
export function isStandalone(): boolean {
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    )
  } catch {
    return false
  }
}
