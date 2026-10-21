import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { makeForecast } from '@/features/verdict/__fixtures__/builders'
import { buildDayStrip } from '../dayStrip'
import { DayStrip } from './DayStrip'

const days = buildDayStrip(makeForecast({ days: 7 }))

function Harness({ onSelect = () => {} }: { onSelect?: (index: number) => void }) {
  const [selected, setSelected] = useState(0)
  return (
    <DayStrip
      days={days}
      selected={selected}
      onSelect={(index) => {
        setSelected(index)
        onSelect(index)
      }}
    />
  )
}

// Day names come from the visible text plus a hidden ", ". jsdom drops the space browsers keep
// between the two spans, hence `,\s?`.
describe('DayStrip', () => {
  it('shows six days with Today selected first', () => {
    render(<Harness />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(6)
    expect(screen.getByRole('button', { name: /^Today,\s?21$/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: /^THU,\s?22$/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('selects a day on click and marks only that one', async () => {
    const onSelect = vi.fn()
    render(<Harness onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('button', { name: /^SAT,\s?24$/ }))
    expect(onSelect).toHaveBeenCalledWith(3)
    expect(screen.getByRole('button', { name: /^SAT,\s?24$/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: /^Today,\s?21$/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('every day is reachable with Tab and selects with Enter and Space', async () => {
    const onSelect = vi.fn()
    render(<Harness onSelect={onSelect} />)
    await userEvent.tab()
    for (let i = 0; i < 5; i++) await userEvent.tab()
    expect(screen.getByRole('button', { name: /^MON,\s?26$/ })).toHaveFocus()

    await userEvent.keyboard('{Enter}')
    expect(onSelect).toHaveBeenLastCalledWith(5)
    await userEvent.tab({ shift: true })
    await userEvent.keyboard(' ')
    expect(onSelect).toHaveBeenLastCalledWith(4)
    expect(screen.getByRole('button', { name: /^SUN,\s?25$/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('hides the decorative weather icons from assistive technology', () => {
    render(<Harness />)
    expect(screen.queryAllByRole('img')).toHaveLength(0)
  })
})
