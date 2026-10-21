import { render, screen } from '@testing-library/react'
import { MapPinOff } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('shows the title as the page heading', () => {
    render(<EmptyState icon={<MapPinOff />} title="Nothing here" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Nothing here' })).toBeInTheDocument()
  })

  it('is a polite status by default and an alert when asked', () => {
    const { rerender } = render(<EmptyState icon={<MapPinOff />} title="Working" />)
    expect(screen.getByRole('status')).toHaveTextContent('Working')

    rerender(<EmptyState icon={<MapPinOff />} title="Broken" role="alert" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Broken')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows the hint and the action only when given', () => {
    const { rerender } = render(<EmptyState icon={<MapPinOff />} title="A" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(document.querySelector('p')).toBeNull()

    rerender(
      <EmptyState
        icon={<MapPinOff />}
        title="A"
        hint="Do the thing"
        action={<button type="button">Retry</button>}
      />,
    )
    expect(screen.getByText('Do the thing')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('hides the icon from assistive technology', () => {
    render(<EmptyState icon={<MapPinOff data-testid="icon" />} title="A" />)
    expect(screen.getByTestId('icon').closest('[aria-hidden="true"]')).not.toBeNull()
  })
})
