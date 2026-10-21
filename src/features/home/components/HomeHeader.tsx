import type { Theme } from '@/features/theme/themeStorage'
import { LocationPill } from './LocationPill'
import { ThemeToggle } from './ThemeToggle'

interface HomeHeaderProps {
  place: string
  refreshing: boolean
  onRefresh: () => void
  theme: Theme
  onToggleTheme: () => void
}

/**
 * Logo on the left; the location pill and the theme toggle at the upper right. When they don't fit
 * (320 px, or zoomed to 200%), the pill and toggle wrap under the logo instead of overflowing
 * (P4.3 FR-011).
 */
export function HomeHeader({
  place,
  refreshing,
  onRefresh,
  theme,
  onToggleTheme,
}: HomeHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-6">
      <span className="font-display text-display text-ink-strong">WashWise</span>
      <div className="ml-auto flex min-w-0 items-center gap-2">
        <LocationPill place={place} refreshing={refreshing} onRefresh={onRefresh} />
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  )
}
