import { vi } from 'vitest'

/** Dispatches a fake `beforeinstallprompt` whose browser dialog answers `outcome`. */
export function offerInstall(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: vi.fn(() => Promise.resolve()),
    userChoice: Promise.resolve({ outcome }),
  })
  window.dispatchEvent(event)
  return event
}

/** Sets Safari's `navigator.standalone` (iOS home-screen app). Returns a function that removes it. */
export function setIosStandalone(value: boolean | undefined) {
  Object.defineProperty(navigator, 'standalone', { value, configurable: true })
  return () => {
    delete (navigator as Navigator & { standalone?: boolean }).standalone
  }
}
