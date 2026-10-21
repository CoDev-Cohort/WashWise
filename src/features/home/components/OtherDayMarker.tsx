import { Check, CircleHelp, Minus, X } from 'lucide-react'
import type { OtherDaysLabel } from '@/features/verdict'

const MARKERS = {
  Yes: { Icon: Check, className: 'text-accent' },
  Maybe: { Icon: CircleHelp, className: 'text-accent-alt' },
  Wait: { Icon: X, className: 'text-ink-strong' },
  '—': { Icon: Minus, className: 'text-ink-muted' },
} as const satisfies Record<OtherDaysLabel, { Icon: typeof Check; className: string }>

interface OtherDayMarkerProps {
  activity: string
  label: OtherDaysLabel
}

/** Yes / Maybe / Wait, or "—" when unavailable. Icon and text together; the icon is decorative. */
export function OtherDayMarker({ activity, label }: OtherDayMarkerProps) {
  const { Icon, className } = MARKERS[label]
  return (
    <span className="flex items-center gap-1">
      <span className="font-eyebrow text-eyebrow text-ink-muted uppercase">{activity}</span>
      <span className={`inline-flex items-center gap-1 font-status text-status ${className}`}>
        <Icon aria-hidden="true" size={14} />
        {label}
      </span>
    </span>
  )
}
