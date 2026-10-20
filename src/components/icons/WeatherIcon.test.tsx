import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mockMatchMedia } from '@/test/matchMedia'
import { WeatherIcon } from './WeatherIcon'

const REDUCE = '(prefers-reduced-motion: reduce)'

describe('WeatherIcon', () => {
  it('has an accessible label from the weather code', () => {
    mockMatchMedia()
    render(<WeatherIcon code={63} isDay />)
    expect(screen.getByRole('img', { name: 'Rain' })).toHaveAttribute(
      'src',
      '/meteocons/static/rain.svg',
    )
  })

  it('is hidden from assistive technology when decorative', () => {
    mockMatchMedia()
    const { container } = render(<WeatherIcon code={0} isDay decorative />)
    const img = container.querySelector('img')!
    expect(img).toHaveAttribute('alt', '')
    expect(img).toHaveAttribute('aria-hidden', 'true')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('animates the hero icon normally', () => {
    mockMatchMedia({ [REDUCE]: false })
    render(<WeatherIcon code={0} isDay={false} variant="animated" />)
    expect(screen.getByRole('img')).toHaveAttribute('src', '/meteocons/animated/clear-night.svg')
  })

  it('shows the static version of the same icon when reduced motion is on', () => {
    mockMatchMedia({ [REDUCE]: true })
    render(<WeatherIcon code={0} isDay={false} variant="animated" />)
    expect(screen.getByRole('img')).toHaveAttribute('src', '/meteocons/static/clear-night.svg')
  })
})
