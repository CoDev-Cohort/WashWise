import { Moon, Sun } from 'lucide-react'
import type { Theme } from '@/features/theme/themeStorage'

interface ThemeToggleProps {
  theme: Theme
  onToggle: () => void
}

/** Sun/Moon button. Its label says what pressing it does (FR-011). */
export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const dark = theme === 'dark'
  const Icon = dark ? Sun : Moon
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex size-8 items-center justify-center rounded-lg text-ink focus-ring"
    >
      <Icon aria-hidden="true" size={20} />
    </button>
  )
}
