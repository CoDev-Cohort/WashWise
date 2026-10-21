import { useCityName } from '@/features/location/useCityName'
import { useCoordinates } from '@/features/location/useCoordinates'

/** Placeholder. Home sections arrive in P3; they replace this page and read the same hooks. */
export function HomePage() {
  const { lat, lon } = useCoordinates()
  const place = useCityName(lat, lon)

  return (
    <main className="flex flex-1 flex-col gap-4 py-10">
      <h1 className="font-title text-title text-ink">Should you wash?</h1>
      <p className="font-body text-body text-ink-muted">Showing weather for {place}.</p>
      <p className="font-body text-body text-ink-muted">
        Verdict cards, day strip and rain chart arrive in P3.
      </p>
    </main>
  )
}
