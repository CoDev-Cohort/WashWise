import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HomeSkeleton } from './HomeSkeleton'

describe('HomeSkeleton', () => {
  it('is one loading status for the whole page', () => {
    render(<HomeSkeleton />)
    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(screen.getByRole('status', { name: 'Loading forecast' })).toBeInTheDocument()
  })

  it('has a placeholder for every section, in page order', () => {
    const { container } = render(<HomeSkeleton />)
    const sections = [...container.querySelectorAll('[data-section]')].map((el) =>
      el.getAttribute('data-section'),
    )
    expect(sections).toEqual(['strip', 'laundry', 'carWash', 'rain', 'otherDays'])
  })

  it('reads out nothing but the status', () => {
    render(<HomeSkeleton />)
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    const status = screen.getByRole('status')
    ;[...status.children].forEach((child) => {
      if (!child.hasAttribute('aria-hidden')) {
        ;[...child.children].forEach((inner) =>
          expect(inner).toHaveAttribute('aria-hidden', 'true'),
        )
      }
    })
  })

  it('does not animate when the user prefers reduced motion', () => {
    const { container } = render(<HomeSkeleton />)
    container.querySelectorAll('.animate-pulse').forEach((bone) => {
      expect(bone).toHaveClass('motion-reduce:animate-none')
    })
  })
})
