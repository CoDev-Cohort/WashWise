import { useEffect, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

/** How often an open app asks whether a new version was deployed (4.2 FR-008). */
export const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000

export interface AppUpdate {
  /** A new version is waiting and the user hasn't dismissed the toast since the last check. */
  visible: boolean
  dismiss: () => void
  /** Switches to the waiting version and reloads the page. */
  reload: () => void
}

/**
 * The update toast's state (4.2 FR-008, FR-009). The service worker never switches versions by itself
 * (`registerType: 'prompt'`): a new version waits until `reload()`. The browser checks on launch; this
 * also checks hourly and whenever the app comes back to the foreground. Each check brings back a
 * dismissed toast while a version is still waiting. Call it once, from `PwaPrompts`.
 */
export function useAppUpdate(): AppUpdate {
  const registration = useRef<ServiceWorkerRegistration | undefined>(undefined)
  const [dismissed, setDismissed] = useState(false)
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW: (_url, reg) => {
      registration.current = reg
    },
    // No service worker (unsupported, blocked, dev): there is never an update to show.
    onRegisterError: () => {},
  })

  useEffect(() => {
    const check = () => {
      const reg = registration.current
      if (!reg || reg.installing || !navigator.onLine) return
      setDismissed(false)
      reg.update().catch(() => {})
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
    }
    const id = setInterval(check, UPDATE_CHECK_INTERVAL_MS)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return {
    visible: needRefresh && !dismissed,
    dismiss: () => setDismissed(true),
    reload: () => void updateServiceWorker(true),
  }
}
