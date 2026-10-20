import { getWeatherIcon } from '@/features/icons/getWeatherIcon'
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion'

interface WeatherIconProps {
  code: number | null
  isDay: boolean | null
  /** Hero uses `animated`; cards and pills use `static`. */
  variant?: 'static' | 'animated'
  /** Hidden from assistive technology when the condition is already written next to it. */
  decorative?: boolean
  size?: number
  className?: string
}

/**
 * Meteocons weather icon (FR-015 – FR-017). Animated icons fall back to the static
 * version when the device asks for reduced motion.
 */
export function WeatherIcon({
  code,
  isDay,
  variant = 'static',
  decorative = false,
  size = 48,
  className,
}: WeatherIconProps) {
  const reduceMotion = usePrefersReducedMotion()
  const icon = getWeatherIcon(
    code,
    isDay,
    variant === 'animated' && !reduceMotion ? 'animated' : 'static',
  )
  return (
    <img
      src={icon.src}
      width={size}
      height={size}
      alt={decorative ? '' : icon.label}
      aria-hidden={decorative || undefined}
      className={className}
      draggable={false}
    />
  )
}
