import { useEffect } from 'react'

/** Sets the document title for the current page (P4.3 FR-005), so it is announced on navigation. */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title
  }, [title])
}
