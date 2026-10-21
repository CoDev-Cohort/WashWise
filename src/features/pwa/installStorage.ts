/** The only place the install-prompt keys are read or written (4.2 FR-010). Never throws. */
const VISITS_KEY = 'ww-visits'
const COUNTED_KEY = 'ww-visit-counted'
const DISMISSED_KEY = 'ww-install-dismissed'

/** How many visits on this device. Unreadable storage counts as none. */
export function getVisits(): number {
  try {
    const visits = Number(localStorage.getItem(VISITS_KEY))
    return Number.isInteger(visits) && visits > 0 ? visits : 0
  } catch {
    return 0
  }
}

/** Counts this visit, once per browser session (a reload is the same visit). */
export function countVisit() {
  try {
    if (sessionStorage.getItem(COUNTED_KEY)) return
    sessionStorage.setItem(COUNTED_KEY, '1')
    localStorage.setItem(VISITS_KEY, String(getVisits() + 1))
  } catch {
    // Blocked storage: the visit isn't counted, so the prompt never shows. That's fine.
  }
}

export function isInstallDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

/** Remembers "Not now" on this device, with no expiry. */
export function dismissInstall() {
  try {
    localStorage.setItem(DISMISSED_KEY, '1')
  } catch {
    // Blocked storage: the prompt may come back next visit.
  }
}
