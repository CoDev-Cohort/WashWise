import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void) {
  const mql = window.matchMedia?.(QUERY)
  mql?.addEventListener('change', onChange)
  return () => mql?.removeEventListener('change', onChange)
}

const getSnapshot = () => window.matchMedia?.(QUERY).matches ?? false

/** True when the device asks for reduced motion. Updates live if the setting changes. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
