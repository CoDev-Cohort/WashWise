export type Theme = 'light' | 'dark'

/** `localStorage` key for an explicit choice. Absent = follow the system. Mirrored in index.html. */
export const THEME_KEY = 'ww-theme'
export const DARK_QUERY = '(prefers-color-scheme: dark)'

/** The saved choice, or `undefined` when nothing valid is saved or storage is unreadable (FR-010). */
export function readTheme(): Theme | undefined {
  try {
    const value = localStorage.getItem(THEME_KEY)
    return value === 'light' || value === 'dark' ? value : undefined
  } catch {
    return undefined
  }
}

export function writeTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // Storage blocked or full: the toggle still works for this visit.
  }
}

/** A saved choice wins; otherwise the system setting. */
export function resolveTheme(stored: Theme | undefined, systemDark: boolean): Theme {
  return stored ?? (systemDark ? 'dark' : 'light')
}

export function systemPrefersDark(): boolean {
  try {
    return window.matchMedia(DARK_QUERY).matches
  } catch {
    return false
  }
}

/** Puts the theme on `<html>` and matches the browser UI color to the page. */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
  // index.html has two metas that follow the *system* setting; a chosen theme needs one color for both.
  const color = theme === 'dark' ? '#0E1729' : '#1F335C'
  document
    .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    .forEach((meta) => meta.setAttribute('content', color))
}
