import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Activity, Verdict, VerdictResult } from '@/features/verdict'
import type { CardPill } from '../types'
import { VerdictCard } from './VerdictCard'
import { VerdictCards } from './VerdictCards'

const ok = (verdict: Verdict, subLabel: string, activity: Activity = 'laundry'): VerdictResult => ({
  status: 'ok',
  activity,
  verdict,
  subLabel,
  reasons: [],
  window: { start: 0, end: 1 },
  forTomorrow: false,
})

const PILLS: CardPill[] = [
  { kind: 'drying', text: 'Dries in ~2.5 hrs' },
  { kind: 'condition', text: 'Partly cloudy', weatherCode: 2, isDay: true },
]

describe('VerdictCard', () => {
  it.each([
    ['go', 'Go Wash', 'Good to go', 'bg-go-bg', 'text-go-text', 'bg-go-pill'],
    [
      'caution',
      'Caution',
      'Slow drying day',
      'bg-caution-bg',
      'text-caution-text',
      'bg-caution-pill',
    ],
    ['notYet', 'Not yet', 'Better to wait', 'bg-notyet-bg', 'text-notyet-text', 'bg-notyet-pill'],
  ] as const)(
    '%s shows %s, its sub-label and the matching token classes',
    (verdict, word, sub, bg, text, pill) => {
      render(<VerdictCard activity="laundry" result={ok(verdict, sub)} pills={PILLS} />)
      const card = screen.getByRole('article', { name: 'Laundry' })
      expect(within(card).getByText(word)).toBeInTheDocument()
      expect(card).toHaveClass(bg)
      expect(within(card).getByText(sub)).toHaveClass(text)
      expect(within(card).getByText('Dries in ~2.5 hrs').closest('li')).toHaveClass(pill)
    },
  )

  it('lists the pills as text and hides the decorative weather icon', () => {
    render(<VerdictCard activity="laundry" result={ok('go', 'Good to go')} pills={PILLS} />)
    const items = screen.getAllByRole('listitem').map((li) => li.textContent)
    expect(items).toEqual(['Dries in ~2.5 hrs', 'Partly cloudy'])
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('names the car wash card', () => {
    render(<VerdictCard activity="carWash" result={ok('go', 'Good to go', 'carWash')} pills={[]} />)
    expect(screen.getByRole('article', { name: 'Car wash' })).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('shows a neutral state when the verdict is unavailable', () => {
    render(
      <VerdictCard
        activity="laundry"
        result={{ status: 'unavailable', activity: 'laundry', reason: 'missingData' }}
        pills={[]}
      />,
    )
    const card = screen.getByRole('article', { name: 'Laundry' })
    expect(within(card).getByText('Verdict unavailable')).toBeInTheDocument()
    expect(card).toHaveClass('bg-surface-muted')
    expect(card.className).not.toMatch(/go-|caution-|notyet-/)
  })

  it('uses design tokens only (no arbitrary colors)', () => {
    const { container } = render(
      <VerdictCards
        laundry={{ activity: 'laundry', result: ok('go', 'Good to go'), pills: PILLS }}
        carWash={{
          activity: 'carWash',
          result: ok('notYet', 'Rain will undo it', 'carWash'),
          pills: [],
        }}
      />,
    )
    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b|\[#|rgb\(/i)
    expect(screen.getAllByRole('article')).toHaveLength(2)
  })
})
