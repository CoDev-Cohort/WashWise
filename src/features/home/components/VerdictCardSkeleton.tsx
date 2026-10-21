import { Car, Shirt } from 'lucide-react'
import type { Activity } from '@/features/verdict'
import { BONE } from './skeleton'

const ACTIVITY: Record<Activity, { title: string; Icon: typeof Shirt }> = {
  laundry: { title: 'Laundry', Icon: Shirt },
  carWash: { title: 'Car wash', Icon: Car },
}

/** A verdict card's frame. The title is known before data; the verdict, sub-label and pills are not. */
export function VerdictCardSkeleton({ activity }: { activity: Activity }) {
  const { title, Icon } = ACTIVITY[activity]
  return (
    <div
      data-section={activity}
      aria-hidden="true"
      className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4"
    >
      <div className="flex items-center gap-2 text-ink-muted">
        <Icon size={16} />
        <span className="font-eyebrow text-eyebrow uppercase">{title}</span>
      </div>
      <span className={`w-36 font-verdict text-verdict ${BONE}`}>&nbsp;</span>
      <span className={`w-44 font-sublabel text-sublabel ${BONE}`}>&nbsp;</span>
      <div className="flex flex-wrap gap-2">
        {['w-24', 'w-20'].map((width) => (
          <span
            key={width}
            className="inline-flex items-center gap-1 rounded-md bg-surface-muted px-2 py-1 font-pill text-pill"
          >
            <span className="size-4" />
            <span className={width}>&nbsp;</span>
          </span>
        ))}
      </div>
    </div>
  )
}
