import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

const getSnapshot = () => navigator.onLine

/** Whether the device says it is online. `true` can still mean a dead connection; `false` is reliable. */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => true)
}
