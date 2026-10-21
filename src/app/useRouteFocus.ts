import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'

/**
 * After an in-app page change, moves focus to the new page's `h1` (P4.3 FR-005), so keyboard and
 * screen-reader users start at the top of the new page instead of on a button that no longer exists.
 * Never on the first render: a fresh load (including a loader redirect) keeps the browser's focus.
 */
export function useRouteFocus() {
  const { pathname } = useLocation()
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    document.querySelector<HTMLElement>('main h1')?.focus({ preventScroll: true })
  }, [pathname])
}
