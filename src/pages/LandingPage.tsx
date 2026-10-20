import { Link } from 'react-router'

/** Placeholder. The location-permission landing arrives in P2. */
export function LandingPage() {
  return (
    <main className="flex flex-1 flex-col justify-center gap-4 py-10">
      <h1 className="font-display text-display text-ink-strong">WashWise</h1>
      <p className="font-body text-body text-ink-muted">
        Laundry and car-wash advice for today’s weather.
      </p>
      <Link to="/home" className="font-status text-status text-accent underline">
        Continue
      </Link>
    </main>
  )
}
