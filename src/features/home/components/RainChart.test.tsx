import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { RainBar } from '../types'
import { RainChart } from './RainChart'

const bar = (hour: number, percent: number | null, isNextDay = false): RainBar => ({
  time: hour * 3_600_000,
  hourLabel: `${hour % 12 === 0 ? 12 : hour % 12} ${hour < 12 ? 'AM' : 'PM'}`,
  percent,
  isNextDay,
})

describe('RainChart', () => {
  it('has a titled section and one text entry per hour', () => {
    render(<RainChart bars={[bar(15, 10), bar(16, 55), bar(17, 90)]} />)
    const section = screen.getByRole('region', { name: 'Rain chance' })
    const items = within(section)
      .getAllByRole('listitem', { hidden: true })
      .map((li) => li.textContent)
    expect(items).toContain('3 PM: 10% chance of rain')
    expect(items).toContain('4 PM: 55% chance of rain')
    expect(items).toContain('5 PM: 90% chance of rain')
  })

  it('shows each percentage and hour label on the bars', () => {
    render(<RainChart bars={[bar(15, 10), bar(16, 55)]} />)
    expect(screen.getByText('10%')).toBeInTheDocument()
    expect(screen.getByText('55%')).toBeInTheDocument()
    expect(screen.getByText('3 PM')).toBeInTheDocument()
    expect(screen.getByText('4 PM')).toBeInTheDocument()
  })

  it('draws the visual bars hidden from assistive technology so the text list is the one read', () => {
    render(<RainChart bars={[bar(15, 10)]} />)
    expect(screen.getAllByRole('list')).toHaveLength(1) // the sr-only list; the visual one is aria-hidden
  })

  it.each([
    [0, 'bg-rain-1'],
    [19, 'bg-rain-1'],
    [20, 'bg-rain-2'],
    [45, 'bg-rain-3'],
    [60, 'bg-rain-4'],
    [80, 'bg-rain-5'],
    [100, 'bg-rain-5'],
  ])('a %i%% bar uses %s', (percent, token) => {
    const { container } = render(<RainChart bars={[bar(15, percent)]} />)
    expect(container.querySelector(`.${token}`)).not.toBeNull()
  })

  it('shows an unavailable hour as "—" with no bar, not 0%', () => {
    const { container } = render(<RainChart bars={[bar(15, null), bar(16, 30)]} />)
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByText('0%')).not.toBeInTheDocument()
    expect(container.querySelectorAll('[class*="bg-rain-"]')).toHaveLength(1)
    expect(
      within(screen.getByRole('region'))
        .getAllByRole('listitem', { hidden: true })
        .map((li) => li.textContent),
    ).toContain('3 PM: rain chance unavailable')
  })

  it('marks hours that fall on the next day', () => {
    render(<RainChart bars={[bar(23, 10), bar(0, 20, true)]} />)
    expect(screen.getByText('Tmrw')).toBeInTheDocument()
    expect(screen.getByText(/12 AM tomorrow: 20% chance of rain/)).toBeInTheDocument()
  })

  it('says so when there are no hours', () => {
    render(<RainChart bars={[]} />)
    expect(screen.getByText('No hourly forecast for this day.')).toBeInTheDocument()
  })
})
