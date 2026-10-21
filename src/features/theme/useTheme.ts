import { useCallback, useEffect, useState } from 'react'
import {
  applyTheme,
  DARK_QUERY,
  readTheme,
  resolveTheme,
  systemPrefersDark,
  writeTheme,
  type Theme,
} from './themeStorage'

/**
 * The active theme and a toggle (FR-010, FR-011). It follows the system setting until the user
 * picks one; after that the saved choice wins. The class on `<html>` is already set before first
 * paint by the script in index.html, so this only keeps it in step.
 */
export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(() => resolveTheme(readTheme(), systemPrefersDark()))

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    let query: MediaQueryList
    try {
      query = window.matchMedia(DARK_QUERY)
    } catch {
      return
    }
    const onChange = () => {
      if (!readTheme()) setTheme(resolveTheme(undefined, query.matches))
    }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const toggle = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    writeTheme(next)
    setTheme(next)
  }, [theme])

  return { theme, toggle }
}
