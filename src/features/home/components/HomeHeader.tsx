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

/** Logo on the left; the location pill and the theme toggle at the upper right. */
export function HomeHeader({
  place,
  refreshing,
  onRefresh,
  theme,
  onToggleTheme,
}: HomeHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-3 pt-6">
      <span className="font-display text-display text-ink-strong">WashWise</span>
      <div className="flex min-w-0 items-center gap-2">
        <LocationPill place={place} refreshing={refreshing} onRefresh={onRefresh} />
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  )
}
