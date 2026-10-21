import { useEffect, useState } from 'react'
import type { RegisterSWOptions } from 'virtual:pwa-register/react'
import { vi } from 'vitest'

let setNeedRefresh: ((value: boolean) => void) | undefined

/**
 * A stand-in for `virtual:pwa-register/react`. In a test file:
 * `vi.mock('virtual:pwa-register/react', () => import('@/test/pwaRegister'))`, then drive it with
 * `pwaRegister` (wrap `showUpdate` in `act`).
 */
export const pwaRegister = {
  updateServiceWorker: vi.fn(() => Promise.resolve()),
  registration: { update: vi.fn(() => Promise.resolve()), installing: null },
  /** Pretends a new version finished installing and is waiting. */
  showUpdate() {
    setNeedRefresh?.(true)
  },
  reset() {
    this.updateServiceWorker.mockClear()
    this.registration.update.mockClear()
  },
}

export function useRegisterSW(options: RegisterSWOptions = {}) {
  const [needRefresh, set] = useState(false)
  useEffect(() => {
    setNeedRefresh = set
    options.onRegisteredSW?.(
      '/sw.js',
      pwaRegister.registration as unknown as ServiceWorkerRegistration,
    )
    // Registration happens once, like the real hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return {
    needRefresh: [needRefresh, set] as const,
    offlineReady: [false, () => {}] as const,
    updateServiceWorker: pwaRegister.updateServiceWorker,
  }
}
