import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { OtherDaysLabel } from '@/features/verdict'
import type { OtherDayRow } from '../types'
import { OtherDayMarker } from './OtherDayMarker'
import { OtherDaysList } from './OtherDaysList'

const row = (
  index: number,
  laundry: OtherDaysLabel,
  carWash: OtherDaysLabel,
  label = 'THU',
): OtherDayRow => ({
  index,
  date: `2026-10-2${index}`,
  label,
  dateLabel: `2${index}`,
  weatherCode: 0,
  laundry,
  carWash,
})

describe('OtherDayMarker', () => {
  it.each(['Yes', 'Maybe', 'Wait', '—'] as const)(
    'shows "%s" with an icon hidden from assistive tech',
    (label) => {
      const { container } = render(<OtherDayMarker activity="Laundry" label={label} />)
      expect(screen.getByText(label)).toBeInTheDocument()
      expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    },
  )

  it('uses a different icon for each of the three markers', () => {
    const icons = (['Yes', 'Maybe', 'Wait'] as const).map((label) => {
      const { container, unmount } = render(<OtherDayMarker activity="Laundry" label={label} />)
      const html = container.querySelector('svg')!.innerHTML
      unmount()
      return html
    })
    expect(new Set(icons).size).toBe(3)
  })
})

describe('OtherDaysList', () => {
  it('lists a row per day with a marker for each activity', () => {
    render(<OtherDaysList rows={[row(1, 'Yes', 'Maybe'), row(2, 'Wait', '—', 'FRI')]} />)
    const section = screen.getByRole('region', { name: 'Other days' })
    const items = within(section).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('THU21LaundryYesCar washMaybe')
    expect(items[1]).toHaveTextContent('FRI22LaundryWaitCar wash—')
  })

  it('reads each marker with its day and activity as text', () => {
    render(<OtherDaysList rows={[row(1, 'Yes', 'Wait')]} />)
    const item = screen.getByRole('listitem')
    expect(within(item).getByText('Laundry')).toBeInTheDocument()
    expect(within(item).getByText('Car wash')).toBeInTheDocument()
    expect(within(item).getByText('Yes')).toBeInTheDocument()
    expect(within(item).getByText('Wait')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('renders nothing when there are no other days', () => {
    const { container } = render(<OtherDaysList rows={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
