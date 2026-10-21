import type { ReactNode } from 'react'

interface EmptyStateProps {
  /** One decorative icon or logo. It is hidden from assistive technology; the title carries the meaning. */
  icon: ReactNode
  title: string
  /** A line of supporting text under the title. */
  hint?: string
  /** A real `<button>` or `<a>`. */
  action?: ReactNode
  /** `status` is read out politely (progress); `alert` is read out at once (errors). */
  role?: 'status' | 'alert'
  /** The wordmark style, used for the first screen of the app. */
  brand?: boolean
}

/** A screen with one icon, one label and at most one action. The shape of every landing state. */
export function EmptyState({ icon, title, hint, action, role = 'status', brand }: EmptyStateProps) {
  return (
    <main className="flex flex-1 flex-col justify-center py-10">
      <div role={role} className="flex flex-col items-center gap-4 text-center">
        <span aria-hidden="true" className="flex items-center justify-center">
          {icon}
        </span>
        <h1
          className={
            brand ? 'font-display text-display text-ink-strong' : 'font-title text-title text-ink'
          }
        >
          {title}
        </h1>
        {hint && (
          <p className="max-w-[28ch] font-body text-body text-balance text-ink-muted">{hint}</p>
        )}
        {action}
      </div>
    </main>
  )
}
