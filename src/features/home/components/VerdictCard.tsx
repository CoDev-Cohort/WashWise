import { Car, Shirt } from 'lucide-react'
import { useId } from 'react'
import { WeatherIcon } from '@/components/icons/WeatherIcon'
import type { Activity, Verdict, VerdictResult } from '@/features/verdict'
import type { CardPill } from '../types'

const VERDICT_WORD: Record<Verdict, string> = {
  go: 'Go Wash',
  caution: 'Caution',
  notYet: 'Not yet',
}

/** Full class names, so Tailwind can see them. Each verdict uses its own token set. */
const VERDICT_STYLE: Record<Verdict, { card: string; text: string; pill: string }> = {
  go: { card: 'border-go-border bg-go-bg', text: 'text-go-text', pill: 'bg-go-pill' },
  caution: {
    card: 'border-caution-border bg-caution-bg',
    text: 'text-caution-text',
    pill: 'bg-caution-pill',
  },
  notYet: {
    card: 'border-notyet-border bg-notyet-bg',
    text: 'text-notyet-text',
    pill: 'bg-notyet-pill',
  },
}

const NEUTRAL_STYLE = { card: 'border-border bg-surface-muted', text: 'text-ink-muted', pill: '' }

const ACTIVITY: Record<Activity, { title: string; Icon: typeof Shirt }> = {
  laundry: { title: 'Laundry', Icon: Shirt },
  carWash: { title: 'Car wash', Icon: Car },
}

interface VerdictCardProps {
  activity: Activity
  result: VerdictResult
  pills: CardPill[]
}

/** One activity's verdict: the word, why, and a few weather pills (FR-001, FR-002). */
export function VerdictCard({ activity, result, pills }: VerdictCardProps) {
  const titleId = useId()
  const { title, Icon } = ACTIVITY[activity]
  const ok = result.status === 'ok'
  const style = ok ? VERDICT_STYLE[result.verdict] : NEUTRAL_STYLE

  return (
    <article
      data-section={activity}
      aria-labelledby={titleId}
      className={`flex flex-col gap-3 rounded-xl border p-4 ${style.card}`}
    >
      <div className="flex items-center gap-2 text-ink-strong">
        <Icon aria-hidden="true" size={16} />
        <h2 id={titleId} className="font-eyebrow text-eyebrow uppercase">
          {title}
        </h2>
      </div>
      <p className="font-verdict text-verdict text-ink">
        {ok ? VERDICT_WORD[result.verdict] : 'Verdict unavailable'}
      </p>
      <p className={`font-sublabel text-sublabel ${style.text}`}>
        {ok ? result.subLabel : 'Not enough forecast data'}
      </p>
      {pills.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {pills.map((pill) => (
            <li
              key={`${pill.kind}-${pill.text}`}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-pill text-pill text-ink ${style.pill}`}
            >
              {pill.kind === 'condition' && (
                <WeatherIcon
                  code={pill.weatherCode ?? null}
                  isDay={pill.isDay ?? true}
                  decorative
                  size={16}
                />
              )}
              {pill.text}
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}
